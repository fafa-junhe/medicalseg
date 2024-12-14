import os
from flask import Flask, flash, jsonify, make_response, redirect, request, render_template, Response, send_from_directory, session, send_file
from flask_session import Session
from flask_cors import CORS
import SimpleITK as sitk

from threading import Thread
import subprocess
import csv
import datetime
import time
import re
import glob
from utils.taskpool import TaskPool
from utils.image_thumbnail_task import GetImageThumbnail
from utils.data_infer_task import InferDataTask

from database.database_connector import DatabaseConnector
from faker import Faker
import logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.WARNING)
app = Flask(__name__,  static_url_path='/static/')
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SECRET_KEY'] = 'e9d7e371c6e5eb5011d22156f9262bab'
app.config["SESSION_PERMANENT"] = False
app.config.update(SESSION_COOKIE_SAMESITE="None", SESSION_COOKIE_SECURE=True)
fake = Faker('zh_CN')

Session(app)
CORS(app, supports_credentials=True)  # 设置跨域
app.config['SESSION_COOKIE_SAMESITE'] = "None" 
app.config['SESSION_COOKIE_SECURE'] = True 

taskpool = TaskPool()

uploads = 'uploads'

uploads_medical = uploads + "/medical_data"
uploads_label = uploads + "/label_data"
uploads_thumbnail = uploads + "/thumbnail"
face_image = 'face/'


def get_next_file_index():
    files = glob.glob(os.path.
    join(uploads_medical, '*.nii*'))
    indices = [int(re.findall(r'\d+', file)[0]) for file in files]
    return max(indices) + 1 if indices else 1

def get_file_type(file_path):
    parts = file_path.split('/')
    file_name = parts[-1]
    file_name_parts = file_name.split('.')
    file_type = ".".join(file_name_parts[1:])
    return file_type


dc = DatabaseConnector(database_file='hospital.db')

@app.route('/<path:path>')
def static_file(path):
    return app.send_static_file(path)

@app.route('/')
def root():
    return app.send_static_file("index.html")

@app.route('/generate/label_data/<int:id>')
def generate(id):
    file_path = os.path.join(uploads_medical, f'{id}.nii.gz')
    if not os.path.exists(file_path):
        return "未找到文件", 400
    taskpool.add_task(InferDataTask(file_path, id))
    return "OK", 200

@app.route('/upload/medical_data', methods=['POST'])
def upload_file():
    f = request.files.get('file')
    if not f:
        return "未选择文件", 400
    ext = get_file_type(f.filename)
    if ext not in ['nii', 'nii.gz', 'raw', 'mhd', 'dcm']:
        return "仅可选择格式为 nii.gz, nii,  raw, mhd, dcm 的文件", 400
    if ext == 'raw':
        ext = 'mhd'

    index = request.form.get('index')
    if not index:
        index = get_next_file_index()

    filename = f'{index}.{ext}'
    filepath = os.path.join(uploads_medical, filename)
    f.save(filepath)
    if ext == 'mhd':
        img = sitk.ReadImage(filepath)
        sitk.WriteImage(img, filepath.replace('.mhd', '.nii.gz'))
        filepath = filepath.replace('.mhd', '.nii.gz')
        os.remove(filepath.replace('.nii.gz', '.raw'))
        os.remove(filepath.replace('.nii.gz', '.mhd'))
    if ext == 'nii':
        img = sitk.ReadImage(filepath)
        sitk.WriteImage(img, filepath.replace('.nii', '.nii.gz'))
        filepath = filepath.replace('.nii', '.nii.gz')
        os.remove(filepath.replace('.nii.gz', '.nii'))
    taskpool.add_task(GetImageThumbnail(filepath, index))
    dc.execute(f"INSERT INTO Image (`ImageId`) VALUES ({index})")
    if request.form.get('infer') == "true":
        taskpool.add_task(InferDataTask(filepath, index))
    return "OK", 200

@app.route('/upload/label_data', methods=['POST'])
def upload_label():
    id = request.form.get('id')
    if not id:
        return '未指定id', 400
    nifti_file = glob.glob(os.path.join(uploads_medical, f'{id}.nii*'))
    if not nifti_file:
        return '未找到对应的医疗数据', 400

    f = request.files.get('file')
    if not f:
        return '未选择文件', 400
    ext = get_file_type(f.filename)
    if ext not in ['nii', 'nii.gz']:
        return '仅可选择格式为 nii.gz, nii,  raw, mhd, dcm 的文件', 400
    filename = f'{id}.{ext}'
    filepath = os.path.join(uploads_label, filename)
    f.save(filepath)
    taskpool.add_task(GetImageThumbnail(nifti_file[0], id, filepath))

    return 'OK', 200


@app.route('/get/medical_data')
def get_medical_data():
    data = []
    files = glob.glob(os.path.join(uploads_medical, '*.nii*'))
    for file in files:
        
        filename = os.path.basename(file)
        id = int(re.findall(r'\d+', filename)[0])
        create_time = datetime.datetime.fromtimestamp(os.path.getctime(file)).strftime('%Y年%m月%d日 %H:%M:%S')        
        file_size = os.path.getsize(file)
        label_path = glob.glob(os.path.join(uploads_label, f'{id}.nii*'))
        has_label = True
        if not label_path:
            has_label = False
        image = dc.select('Image', "*", f"ImageId={id}")
        patientName = "未知"
        try:
            if image:
                record = dc.select("DiseaseRecord", "*", f"RecordID={image[0][1]}")
                patient = dc.select("Patients", "*", f"IDNumber={record[0][1]}")
                patientName = patient[0][1]
        except:
            pass
        data.append({
            'id': id,
            'create_time': create_time,
            'file_size': file_size,
            'file_path': file,
            'has_label': has_label,
            'label_path': label_path[0] if has_label else None,
            'patient': patientName
        })
    return jsonify(data)


@app.route('/download/medical_data/<int:id>.<string:ext>')
def download_medical_data(id, ext):
    file_path = os.path.join(uploads_medical, f'{id}.{ext}')
    if not os.path.exists(file_path):
        return "未找到文件", 400
    return send_from_directory(uploads_medical, f'{id}.{ext}', as_attachment=True)

@app.route('/download/label_data/<int:id>.<string:ext>')
def download_label_data(id, ext):
    file_path = os.path.join(uploads_label, f'{id}.{ext}')
    if not os.path.exists(file_path):
        return "未找到文件", 400
    return send_from_directory(uploads_label, f'{id}.{ext}', as_attachment=True)

@app.route('/download/thumbnail/<int:id>.png')
def download_thumbnail(id):
    file_path = os.path.join(uploads_thumbnail, f'{id}.png')
    if not os.path.exists(file_path):
        return send_from_directory(uploads, "error_loading.png", as_attachment=True)
    return send_from_directory(uploads_thumbnail, f'{id}.png', as_attachment=True)


@app.route('/delete/<int:id>')
def delete_medicaldata(id):
    medical_path = glob.glob(os.path.join(uploads_medical, f'{id}.*'))
    label_path = glob.glob(os.path.join(uploads_label, f'{id}.*'))
    thumbnail_path = os.path.join(uploads_thumbnail, f'{id}.png')
    print(medical_path, label_path, thumbnail_path)
    if len(medical_path) == 0 and not os.path.exists(medical_path[0]):
        return '文件不存在', 400
    os.remove(medical_path[0])
    if len(label_path) != 0 and os.path.exists(label_path[0]):
        os.remove(label_path[0])
    if os.path.exists(thumbnail_path):
        os.remove(thumbnail_path)
    dc.execute(f"DELETE FROM Image WHERE ImageId={id}")
    return 'OK', 200

@app.route("/get/task")
def get_task():
    return taskpool.get_task()

@app.route('/scan/patient', methods=['GET'])
def scan_patient():    
    name = fake.name()
    gender = fake.random_element(elements=('男', '女'))
    age = fake.random_int(min=16, max=60)
    weight = fake.random_int(min=30, max=100)
    phone = fake.phone_number()
    parent_phone = fake.phone_number()
    id_ = str(fake.random_int(min=100000000000000000, max=999999999999999999))
    return jsonify({'result': (name, gender, age, weight, phone, parent_phone, id_)})

@app.route('/add/patient', methods=['POST'])
def add_patient():    
    name = request.form.get('name')
    gender = request.form.get('gender')
    age = request.form.get('age')
    weight = request.form.get('weight')
    phone = request.form.get('phone')
    parent_phone = request.form.get('parent_phone')
    patient_id = request.form.get('id')
    current_time = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    if (dc.select("Patients", "Name", f"IdNumber={patient_id}")):
        dc.update("Patients", f"Name='{name}',Gender='{gender}',Age='{age}',Weight='{weight}',Phone='{phone}',ParentPhone='{parent_phone}',EditTime='{current_time}'", f"IdNumber={patient_id}")
    else:
        dc.insert("Patients", (name, gender, age, weight, phone, parent_phone, patient_id, current_time), "(`Name`,`Gender`,`Age`,`Weight`,`Phone`,`ParentPhone`,`IdNumber`,`EditTime`)")
    return 'OK', 200




@app.route('/get/patients', methods=['GET'])
def get_patients():
    order_by = request.args.get('order_by')
    if not order_by:
        order_by = 'PatientID,'
    patient_name = request.args.get('name')
    print(f"SELECT * FROM Patients ORDER BY {order_by}")
    if patient_name:
        result = dc.cursor.execute(f"SELECT * FROM Patients WHERE Name LIKE '%{patient_name}%' ORDER BY {order_by[:-1]}").fetchall()
    else:
        result = dc.cursor.execute(f"SELECT * FROM Patients ORDER BY {order_by[:-1]}").fetchall()
    return jsonify(result)

@app.route('/delete/patient', methods=['GET'])
def get_patient():
    id = request.args.get('id')
    if not id:
        return '未指定id', 400
    dc.execute(f"DELETE FROM DiseaseRecord WHERE PatientID={id}")
    dc.execute(f"DELETE FROM Patients WHERE IdNumber={id}")
    return 'OK', 200

@app.route('/add/disease_record', methods=['POST'])
def add_disease_record():
    patient_id = request.form.get('patient_id')
    MZ_Docter = request.form.get('MZdocter')
    docter = request.form.get('docter')
    nurse = request.form.get('nurse')
    inHospital = request.form.get('inHospital')
    symptom = request.form.get('symptom')
    diagnosis = request.form.get('diagnosis')
    needImage = request.form.get('needImage')
    current_time = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    dc.update("Patients", f"EditTime='{current_time}'", f"IdNumber={patient_id}")
    dc.insert("DiseaseRecord", (patient_id, MZ_Docter, docter, nurse, symptom, diagnosis, inHospital, needImage), "(`PatientId`,`MZDoctor`,`Doctor`,`Nurse`,`Symptoms`,`Diagnosis`,`InHospital`,`NeedImage`)")

    return 'OK', 200


@app.route('/get/disease_record/<int:patientId>', methods=['GET'])
def get_disease_record(patientId):
    result = dc.select("DiseaseRecord", "*", f"PatientId={patientId}")
    return jsonify(result)

@app.route('/delete/disease_record', methods=['GET'])
def delete_disease_record():
    id = request.args.get('id')
    if not id:
        return '未指定id', 400
    dc.update("Image", "RecordID=NULL", f"RecordID={id}")
    dc.execute(f"DELETE FROM DiseaseRecord WHERE RecordID={id}")
    return 'OK', 200

@app.route('/update/disease_record', methods=['POST'])
def update_disease_record():
    id = request.form.get('id')
    patient_id = request.form.get('patient_id')
    MZ_Docter = request.form.get('MZdocter')
    docter = request.form.get('docter')
    nurse = request.form.get('nurse')
    inHospital = request.form.get('inHospital')
    symptom = request.form.get('symptom')
    diagnosis = request.form.get('diagnosis')
    needImage = request.form.get('needImage')
    current_time = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    dc.update("Patients", f"EditTime='{current_time}'", f"IdNumber={patient_id}")
    dc.update("DiseaseRecord", f"PatientId='{patient_id}',MZDoctor='{MZ_Docter}',Doctor='{docter}',Nurse='{nurse}',Symptoms='{symptom}',Diagnosis='{diagnosis}',InHospital='{inHospital}',NeedImage='{needImage}'", f"RecordID={id}")
    return 'OK', 200


@app.route("/get/ct_image/<int:recordId>", methods=['GET'])
def get_ct_image(recordId):
    result = dc.select("DiseaseRecord", "*", f"RecordID={recordId}")
    if not result:
        return '未找到病历', 400
    result = dc.select("Image", "*")
    for i in result:
        if i[1] == recordId:
            return str(i[0]), 200
    if request.args.get('new') == "false":
        return '无空闲图片', 400
    for i in result:
        if i[1] == None:
            dc.update("Image", f"RecordID={recordId}", f"ImageID={i[0]}")
            return str(i[0]), 200
    return '无空闲图片', 400



if __name__ == '__main__':
    dc.create_database()
    taskpool.start()
    app.run(debug=True, host="0.0.0.0", port="80")
    taskpool.stop()