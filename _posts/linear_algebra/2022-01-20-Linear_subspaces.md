---
layout: home
title: "Linear Algebra - Vector Spaces"
sidebar:
  nav: "docs"
author_profile: true
---

---

본 포스팅에서는 **선형 부분공간 (Linear subspace)**에 대해 다루어 봅니다.

***

# 선형 부분공간이란?

**선형 부분공간(linear subspace)**는 벡터 부분공간(vector subspace)라고도 부르며, 다음과 같이 정의됩니다.

> 어떠한 체(field) $\mathcal{K}$에서 정의된 벡터 공간 $\mathcal{V}$가 있고, 그 부분집합 $\mathcal{W}$가 있다고 하자. 이 때, $\mathcal{V}$에서 정의된 연산에 의해 $\mathcal{W}$이 벡터 공간으로 정의된다면, $\mathcal{W}$은 $\mathcal{V}$의 선형 부분공간이다.

앞선 [포스팅](https://youngwoong-cho.github.io/Vector_Spaces/)에서 **벡터 공간**이란 **벡터 합과 스칼라 곱이 정의된 벡터의 집합**이라고 했습니다. 이 때, 벡터 공간의 부분집합이 그 자체로 벡터 공간이 될 조건을 만족한다면, 이 부분집합은 **선형 부분공간**이 될 수 있습니다.

# Column space, Row space, Null space
대표적인 선형 부분공간인 column space, row space, 그리고 null space에 대해 알아보겠습니다.

## Column space
$m \times n$ 행렬 $A$를 생각해 봅시다.

$$A = 
\begin{bmatrix}
a_{11} & a_{12} & ... & a_{1n} \\
a_{21} & a_{22} & ... & a_{2n} \\
... \\
a_{m1} & a_{m2} & ... & a_{mn}
\end{bmatrix}
$$

$A$는 $n$개의 column vector의 모음으로 생각할 수 있습니다. 다시 말해, 다음과 같이 표현할 수 있습니다.

$$A = 
\begin{bmatrix}
| & | & ... & | \\
\vec{v}_{1} & \vec{v}_{2} & ... & \vec{v}_{n} \\
| & | & ... & |
\end{bmatrix}
$$

이 때, **각각의 column vector의 가능한 모든 선형 합**을 **A의 column space**라고 부릅니다. 다른 말로, $A$의 column space는 **column vector들의 span**이라고 할 수 있습니다.

> $m \times n$ matrix $A$의 column space는 column vector ($\vec{v}_1$, $\vec{v}_2$, ...)들의 span이다!

즉, 임의의 실수 $c_i$에 대해 $c_1 \vec{v}_1 + c_2 \vec{v}_2 + ...$ 로 갈 수 있는 모든 공간이 A의 column space가 되는 것입니다.

예시를 한 번 볼까요? $3 \times 2$ 행렬 $A$가 다음과 같다고 해 봅시다.

$$A = 
\begin{bmatrix}
1 & 0 \\
0 & 1 \\
2 & -1
\end{bmatrix}
$$

Column vector는 다음과 같습니다.

$$
\vec{v}_1 = \begin{bmatrix}
1 \\
0 \\
2
\end{bmatrix}, \quad
\vec{v}_2 = \begin{bmatrix}
0 \\
1 \\
-1
\end{bmatrix}
$$

3차원 공간에 column vector를 시각화 해 봅시다.
