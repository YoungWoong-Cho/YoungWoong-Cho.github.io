---
layout: home
title: "Linear Algebra - Vector Spaces"
sidebar:
  nav: "docs"
author_profile: true
---

---

본 포스팅에서는 **벡터 공간 (Vector space)**에 대해 다루어 봅니다.

***

# 벡터 공간이란?

**벡터 공간**이란 **벡터 합**과 **스칼라 곱**이라는 두 가지 연산이 정의된 **벡터의 집합**을 뜻합니다.

## 벡터 합과 스칼라 곱
**벡터 합**이란, 두 벡터 $\vec{u}$와 $\vec{v}$로부터 새로운 벡터 $\vec{w}$를 mapping하는 연산을 뜻하며, 통상적으로 $+$ 기호를 사용하여 나타냅니다. 즉,

$$
\vec{u} + \vec{v} = \vec{w}
$$

를 만족하며, $\vec{w}$ 또한 같은 벡터 집합에 속해야 합니다.

다음으로 **스칼라 곱**이란, 벡터 $\vec{u}$와 스칼라 $\alpha$로부터 새로운 벡터 $\alpha \vec{u}$를 mapping하는 연산을 뜻하며, 보통 $\cdot$ 기호로 나타냅니다. 즉,

$$
\alpha \cdot \vec{u} = \alpha \vec{u}
$$

를 만족합니다.

## 벡터 공간의 Axiom
상기한 조건을 만족하는 벡터 합과 스칼라 곱 연산을 정의한다고 해서 무조건 벡터 공간이 되지는 않습니다. 벡터 공간이 되기 위해서는 위의 연산들이 다음의 axiom들을 만족해야 합니다.

- Associativity of vector addition  

$$
\vec{u} + (\vec{v} + \vec{w}) = (\vec{u} + \vec{v}) + \vec{w}
$$

- Commutativity of vector addition  

$$
\vec{u} + \vec{v} = \vec{v} + \vec{u}
$$

- Identity element of vector addition  

$$
\exists \;\; \vec{0} \in \mathcal{V} \quad \text{s.t.} \quad \vec{v} + \vec{0} = \vec{v} \quad \forall \; \vec{v} \in \mathcal{V}
$$

- Inverse element of vector addition  

$$
\forall \;\; \vec{v} \in \mathcal{V} \;\; \exists \; -\vec{v} \quad \text{s.t.} \quad \vec{v} + \left(-\vec{v}\right) = \vec{0}
$$

- Compatibility of scalar multiplication with field multiplication  

$$
a(b\vec{v}) = (ab)\vec{v}
$$

- Identity element of scalar multiplication  

$$
1\vec{v} = v
$$

- Distributivity of scalar multiplication with respect to vector addition  

$$
a\left(\vec{u} + \vec{v}\right) = a\vec{u} + a\vec{v}
$$

- Distributivity of scalar multiplication with respect to field addition  

$$
\left(a + b\right)\vec{v} = a\vec{v} + b\vec{v}
$$

## 벡터 공간의 예시

벡터 공간의 예시로는 좌표 공간(coordinate space), 함수 공간(function space), 부분공간(subspace), 바나흐 공간(Banach space), 힐베르트 공간(Hilbert space) 등이 있습니다. 각각에 대해서는 별도의 포스팅에서 다루겠습니다.

# Summary
> 벡터 공간이란 **axiom을 만족하는 연산** (**벡터 합**과 **스칼라 곱**) 이 정의된 **벡터의 집합입**니다.