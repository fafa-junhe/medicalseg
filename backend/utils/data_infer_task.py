from subprocess import check_output, CalledProcessError, STDOUT
from .image_thumbnail_task import GetImageThumbnail
from utils.taskpool import Task
import shutil
import uuid
import os
import time
class InferDataTask(Task):
    def __init__(self, image, name):
        self.image = image
        self._name = name
        self.infer_command = r"""python.exe infer.py --image_folder ../infer_image/ --output_folder output --model_type cascade_lowres --plan_path ./nnUNetPlansv2.1_plans_3D.pkl --model_path ./model/model.pdmodel --param_paths ./model/model.pdiparams --postprocessing_json_path ./postprocessing.json --num_threads_nifti_save 1 --num_threads_preprocessing 1"""
        self.start_time = time.time()
        self.progress = 0
    def name(self):
        return f"推理{self._name}的标签"
    def get_progress(self):
        if self.progress == 0.9:
            return 0.9
        return min((time.time() - self.start_time) / 250, 0.9)
    def run(self, taskpool):
        id = uuid.uuid4()
        if os.path.exists("../infer_image/"):
            shutil.rmtree("../infer_image/")
        os.mkdir("../infer_image/")
        print(self.image, f"../infer_image/{str(id)+'_0000.nii.gz'}")
        shutil.copy(self.image, f"../infer_image/{str(id)+'_0000.nii.gz'}")
        output = check_output(["cmd.exe", "/c", self.infer_command], stderr=open("log", "w")).decode(encoding="gbk")
        self.progress = 0.9
        shutil.copy(f"output/{str(id)+'.nii.gz'}", self.image.replace("medical_data", "label_data"))
        os.remove(f"output/{str(id)+'.nii.gz'}")
        taskpool.add_task(GetImageThumbnail(self.image, self._name, self.image.replace("medical_data", "label_data")))