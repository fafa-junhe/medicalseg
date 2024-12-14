CREATE TABLE IF NOT EXISTS Patients (
    PatientID INTEGER PRIMARY KEY,
    Name TEXT NOT NULL,
    Gender TEXT NOT NULL,
    Age INTEGER NOT NULL,
    Weight INTEGER NOT NULL,
    Phone TEXT NOT NULL,
    ParentPhone TEXT NOT NULL,
    IdNumber TEXT NOT NULL,
    EditTime TEXT
);
CREATE TABLE IF NOT EXISTS Image (
    ImageID INTEGER PRIMARY KEY,
    RecordID INTEGER REFERENCES DiseaseRecord(RecordID)
);

CREATE TABLE IF NOT EXISTS DiseaseRecord (
    RecordID INTEGER PRIMARY KEY,
    PatientID INTEGER REFERENCES Patients(PatientID),
    MZDoctor TEXT,
    Doctor TEXT,
    Nurse TEXT,
    Symptoms TEXT,
    Diagnosis TEXT,
    NeedImage BOOLEAN NOT NULL,
    InHospital BOOLEAN NOT NULL
);
