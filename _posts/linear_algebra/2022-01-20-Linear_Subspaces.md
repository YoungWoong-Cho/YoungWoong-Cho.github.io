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

이 두 column vector의 선형 결합으로 span되는 공간이 바로 column space입니다.

$$
C(A) = \text{span}(\vec{v}_1, \vec{v}_2)
$$

## Rank와 basis
앞서 예시로 들었던 $A$는 **선형 독립**, 즉 linearly independent한 행렬입니다. 선형 독립인 column vector들은 각각이 column space의 **basis**가 될 수 있습니다. 그리고 이 linearly independent한 colum space의 basis의 개수가 바로 **rank**가 됩니다.


**선형 종속** (linearly dependent) 적인 column vector들로 구성된 행렬의 경우는 어떨까요? 어떤 column vector는 나머지 column vector들의 선형 합으로 나타내어 질 수 있으니, column vector 중 **basis로 기능하지 못하는 벡터**가 있을 것입니다. 따라서 이 때는 column vector의 개수보다 basis의 개수가 적을 것이고, rank 또한 작아집니다.

정리하자면, 행렬 $A$의 column vector들 가운데 **선형 독립 (linearly independent) 적인 column vector의 개수는 곧 basis vector의 개수와 같으며, 이는 rank와도 같습니다**. 특히 모든 column vector들이 linearly independent할 경우를 **full rank**라고 부릅니다.

## Row space
Column space에 대해 이해했다면, row space에 관한 내용도 곧바로 이해할 수 있습니다. 이름에서 알 수 있다시피, row space는 row vector들로 span되는 space를 뜻합니다.

앞서의 $m \times n$ 행렬 $A$로 돌아가서, 이번에는 row vector의 모음으로 나타내 봅시다.

$$A = 
\begin{bmatrix}
1 & 0 \\
0 & 1 \\
2 & -1
\end{bmatrix} =
\begin{bmatrix}
— & \vec{u}_1 & — \\
— & \vec{u}_2 & — \\
— & \vec{u}_3 & —
\end{bmatrix}
$$

이 row vector들 ($\vec{u}_1$, $\vec{u}_2$, $\vec{u}_3$)의 선형 결합으로 span되는 공간이 바로 row space입니다.

참고로, row space는 $A^T$의 column space와 같으므로, 다음과 같이 나타냅니다.
$$
C(A^T) = \text{span}(\vec{u}_1, \vec{u}_2, \vec{u}_3)
$$

## Null space
Null space는 kernel이라고도 불립니다. Null space는 선형 변환 이후에 zero vector가 되는 공간을 뜻합니다.

$m \times n$ 행렬 $A$에 대하여

$$
N(A) = \text{ker}(A) = \{ \vec{v} \in K^m \; | \; A\vec{v} = \vec{0} \}
$$

가 성립하는 벡터 $\vec{v}$의 집합이 바로 null space가 됩니다.

Full rank가 아닌 선형 변환, 즉 linearly dependent한 column vector를 포함하는 행렬의 경우에는 필연적으로 차원 감소가 이루어지고, 이 감소된 차원들은 zero vector로 mapping되게 됩니다.

Null space도 linear subspace이므로 vector space의 속성을 만족합니다. 즉, $\vec{v}_1 \in N(A)$이고 $\vec{v}_2 \in N(A)$ 이면 $\vec{v}_1 + \vec{v}_2 \in N(A)$가 성립하며, $\vec{v}_1 \in N(A)$이고 $c \in K^m$이면 $c\vec{v}_1 \in N(A)$가 성립합니다.

## Left null space
Null space와 left null space의 관계는 column space와 row space와의 관계와 유사합니다.

$m \times n$ 행렬 $A$에 대하여

$$
N(A^T) = \text{ker}(A^T) = \{ \vec{v} \in K^n \; | \; A^T \vec{v} = \vec{0} \quad \text{or} \quad \vec{v}^TA = \vec{0}^T \}
$$

가 성립하는 벡터 $\vec{v}$의 집합이 바로 left null space가 됩니다.

Left null space가 **left** null space인 이유는 $\vec{v}^TA=\vec{0}^T$에서 linear operation의 대상이 되는 $\vec{v}^T$가 operator인 $A$의 왼쪽에 위치하게 되기 때문입니다.

# Summary
- 선형 부분공간(linear subspace)이란 vector space의 속성 (벡터 합, 스칼라 곱에 대해 닫혀 있고 zero vector를 포함)을 가지는 vector space의 부분집합을 뜻합니다.
- Column space는 행렬 $A$의 column vector로 span되는 선형 부분공간입니다.
- Row space는 행렬 $A$의 row vector로 span되는 선형 부분공간입니다.
- Null space는 행렬 $A$로 나타내어지는 선형 변환에 의해 zero vector가 되는 선형 부분공간입니다.
- Left null space는 행렬 $A^T$로 나타내어지는 선형 변환에 의해 zero vector가 되는 선형 부분공간입니다.
- Basis는 선형 독립(linearly independent)한 벡터의 집합입니다.
- Rank는 basis의 개수입니다.