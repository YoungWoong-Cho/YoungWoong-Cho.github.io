# -*- coding: utf-8 -*-
"""
Created on Thu Aug  6 21:23:59 2020

@author: YangOng
"""

import numpy as np
import matplotlib.pyplot as plt

def cos(x):
    return np.cos(x)

yjjang = np.linspace(0, 10, 1000)

plt.xlabel('yujin')
plt.plot(yjjang, cos(yjjang))
plt.legend(['yujin'])
plt.show()