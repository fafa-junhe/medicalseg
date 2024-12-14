from collections import deque
import threading
import time

import threading
from queue import Queue
class Task:
    def run(self):
        pass
    def name(self):
        pass
    def get_progress(self):
        pass

class TaskPool:
    def __init__(self):
        self.tasks = deque()
        self.finished = []
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.current = None
        self.stoping = False
    def add_task(self, task):
        self.tasks.append(task)

    def start(self):
        self.thread.start()

    def get_task(self):
        tasks = []
        for i in self.finished:
            tasks.append([i.name(), '已完成', 1])
        if self.current != None:
            tasks.append([self.current.name(), '正在运行', self.current.get_progress()])
        for i in self.tasks:
            tasks.append([i.name(), '等待中', 0])
        return tasks

    def _run(self):
        while not self.stoping:
            if len(self.tasks) > 0:
                task = self.tasks.popleft()
                self.current = task
                task.run(self)
                self.current = None
                if len(self.finished) >= 10: 
                    self.finished.pop(0)
                self.finished.append(task)
            else:
                time.sleep(0.1)
    
    def stop(self):
        self.stoping = True
        self.thread.join()