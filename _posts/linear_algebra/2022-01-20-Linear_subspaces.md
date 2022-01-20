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