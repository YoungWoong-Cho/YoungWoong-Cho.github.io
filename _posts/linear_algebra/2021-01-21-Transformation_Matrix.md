---
layout: home
title: "Linear Algebra - Vector Spaces"
sidebar:
  nav: "docs"
author_profile: true
---

---

본 포스팅에서는 **변환 행렬 (Transformation matrix)**에 대해 다루어 봅니다.

***

# 변환 행렬이란?

**변환 행렬 (Transformation matrix)**은 $\mathbb{R}^n$에서 $\mathbb{R}^m$으로의 선형 변환 mapping을 표현하는 $m \times n$ 행렬을 뜻합니다.

$$
T(\vec{x}) = A\vec{x} \quad \text{where} \quad 
A = \begin{bmatrix}
a_{11} & a_{12} & ... & a_{1n} \\
a_{21} & a_{22} & ... & a_{2n} \\
... \\
a_{m1} & a_{m2} & ... & a_{mn}
\end{bmatrix} 
$$

# 기하 변환 (Geometric transformation)
변환 행렬 중 컴퓨터 비전/로보틱스 분야에서 많이 쓰이는 종류는 바로 기하 변환 (geometric transformation) 입니다.

기하 변환의 종류에는 여러 가지가 있지만, 주로 사용되는 변환은 다음과 같습니다.

- Translation transformation
    - 거리와 절대 각도 유지 (변환 전후의 local coord의 방향이 동일)
- Rotation transformation
    - 거리와 상대 각도 유지 (변환 전후의 local coord의 방향이 다름)
- Homogeneous transformation
    - Translation과 rotation을 homogeneous matrix로 한꺼번에 표현
- Similarity transformation
    - 상대 각도와 거리 비율 유지 (resizing)
- Affine transformation
    - 선형성, 평행성 유지 (scaling, shear)
- Projective transformation (Homography)
    - Colinearity 유지 (변환 전의 직선이 변환 후에도 직선)


# Homogeneous transformation
Homogeneous transformation matrix는 rotation과 translation을 함께 표현하는 $4 \times 4$ 행렬이며, 다음과 같은 모양을 가집니다.

$$
T = \begin{bmatrix}
R & p \\
0 & 1
\end{bmatrix}
$$

여기서 $R$는 $SO(3)$군에 속하는 $3 \times 3$ 행렬이며, $p$는 $3 \times 1$ column vector입니다.

Homogeneous transformation matrix은 다음의 속성을 가집니다.
- $T^{-1} =
\begin{bmatrix}
R^T & -R^Tp \\
0 & 1
\end{bmatrix}$
- $(T_1 T_2)T_3 = T_1(T_2 T_3)$
- $T_1 T_2 \neq T_2 T_1$

Homogeneous transformation matrix은 $SE(3)$에 속합니다.

$$
T \in SE(3)
$$

## O(3), SO(3), SE(3)
$O(3)$은 $3 \times 3$ 행렬 가운데 determinant가 $\pm1$인 orthogonal matrix를 뜻합니다.

> Orthogonal matrix는 $QQ^{-1}=Q^{-1}Q=I$를 만족하는 행렬 $Q$입니다. 즉, $Q^{-1}=Q^T$입니다.

$SO(3)$은 **S**pecial **O**rthogonal group을 뜻하며, $O(3)$ 행렬 중에서 distance-preserving transformation이 성립하는 행렬을 뜻합니다.

$SE(3)$는 **S**pecial **E**uclidean group을 뜻하며, 상기한 $T$ 행렬 가운데 affine transformation과 rigid transformation이 성립하는 행렬을 뜻합니다.