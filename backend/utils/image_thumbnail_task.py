import nibabel as nib
import numpy as np
import matplotlib.pyplot as plt
from scipy.ndimage import zoom
import time
import os
from utils.taskpool import Task
import random
class GetImageThumbnail(Task):
    def __init__(self, image, name, label = None):
        self.image = image
        self._name = name
        self.label = label
        self.progress = 0
        self.thumbnail = self.image.replace("medical_data", "thumbnail").replace(".nii.gz", ".png")
    def name(self):
        return f"获取{self._name}的缩略图"
    def get_progress(self):
        return self.progress
    def run(self, taskpool):
        if os.path.exists(self.thumbnail):
            os.remove(self.thumbnail)
        fig = plt.figure(figsize=(0.5, 0.5), frameon=False)
        ax = plt.Axes(fig, [0., 0., 1., 1.])
        ax.set_axis_off()
        fig.add_axes(ax)
        self.progress = 0.1
        if self.label != None:
            print(self.image, self.label, os.path.exists(self.label))
            im_data = nib.load(self.label)
            data_data = im_data.get_fdata()
            zoom_factor = data_data.shape[1]/data_data.shape[2]
            self.progress = 0.3
            data_data = data_data[:,data_data.shape[1]//2,:]
            data_data = zoom(data_data, zoom=(1, zoom_factor))
            data_data = np.rot90(data_data)
            ax.imshow(data_data, 'Accent',alpha=1, interpolation='none')
        self.progress = 0.5
        im_data = nib.load(self.image)
        data_data = im_data.get_fdata()
        zoom_factor = data_data.shape[1]/data_data.shape[2]
        self.progress = 0.8
        data_data = data_data[:,data_data.shape[1]//2,:]
        data_data = zoom(data_data, zoom=(1, zoom_factor))
        data_data = np.rot90(data_data)
        shapes = np.copy(data_data.shape[0])
        self.progress = 0.9
        ax.imshow(data_data, 'gray', alpha=0.7, interpolation='none')

        plt.savefig(self.thumbnail, dpi=shapes)
        self.progress = 1