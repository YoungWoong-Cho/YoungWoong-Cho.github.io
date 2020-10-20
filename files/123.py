from scipy.integrate import odeint
from mpl_toolkits import mplot3d
from mpl_toolkits.mplot3d import Axes3D
import numpy as np
import matplotlib.pyplot as plt

m = 1 # kg
k = 5 # N/m
s0 = 3 # m
g = 9.8 # m/s^2
r = 0.1 # m

"""
Converts a given 3*1 vector into a corresponding 3*3 skew-symmetric tilde matrix.
Input: v (3*1 vector)
"""
def tilde(v):
    return np.array([[ 0, -v[2], v[1] ],
                     [ v[2], 0, -v[0] ],
                     [ -v[1], v[0], 0 ]])

"""
Constructs a rotation matrix using Rodrigues' formula.
Input: w (3*1 angular velocity vector), t (time)
"""
def R(w, t):
    n = np.linalg.norm(w)
    oT = tilde(w)
    if (n == 0):
        return np.identity(3)
    else:
        return np.identity(3) + (oT/n) * np.sin(n*t) + (oT/n).dot(oT/n) * (1 - np.cos(n*t))

"""
Constructs a transform matrix.
Input: R (3*3 rotation matrix), s (3*1 position vector)
"""
def T(R, s):
    return np.concatenate((np.concatenate((R, s), axis=1), np.array([0, 0, 0, 1], ndmin=2)), axis=0)

"""
Calculates a moment of inertia of a sphere with mass m and radius r
"""
def J_c(m, r):
    return np.array([[(2/5)*m*(r**2), 0, 0],
                     [0, (2/5)*m*(r**2), 0],
                     [0, 0, (2/5)*m*(r**2)]])


x = np.array([0, -4, -4])
v = np.array([0, 0, 0])
w = np.array([0, 0, 0])
t = 1

W = np.array([0, 0, -m*g])
J_inv = np.linalg.inv(J_c(m, r))
xT = tilde(x)
oT = tilde(w)

R0 = R(np.array([1, 0, 0]), 0)

dxdt =  np.array([v[0], v[1], v[2],
                    k*x[0] * (s0/np.linalg.norm(x) - 1),
                    k*x[1] * (s0/np.linalg.norm(x) - 1),
                    k*x[2] * (s0/np.linalg.norm(x) - 1) - m*g]).reshape(6,1)
dwdt = J_inv.dot(  R(w,t).T.dot( xT.dot( W ) )   -   oT.dot(J_c(m,r).dot(w))   ).reshape(3,1)
dRdt = oT.dot(R(w, t)).reshape(9,1)

fig = plt.figure()
ax = fig.gca(projection='3d')
ax = fig.add_subplot(1, 1, 1, projection = '3d')
lim = 2
ax.set_xlim(-lim, lim)
ax.set_ylim(-lim, lim)
ax.set_zlim(-lim, lim)
ax.quiver(0, 0, 0, R0[0][0], R0[1][0], R0[2][0], color = 'red')
ax.quiver(0, 0, 0, R0[0][1], R0[1][1], R0[2][1], color = 'blue')
ax.quiver(0, 0, 0, R0[0][2], R0[1][2], R0[2][2], color = 'green')

print( xT, '\n')
print( xT.dot (W) , '\n')
print( R0.T.dot(xT.dot (W)) , '\n' )
print( J_inv, '\n')
print( J_inv.dot(R0.T.dot(xT.dot(W)) - oT.dot(J_c(m,r).dot(w))) ) 