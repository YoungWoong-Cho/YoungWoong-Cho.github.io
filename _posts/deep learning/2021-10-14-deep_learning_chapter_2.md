---
layout: posts
title: "[Deep Learning] Chapter 2: Linear Algebra
sidebar:
  nav: "docs"

use_math: true
---

# Scalars, Vectors, Matrices and Tensors
- Scalars
  - Just a single number.
  - ex) $s \in \mathbb{R}$, $n \in \mathbb{N}$
- Vectors
  - An array of numbers.
  - ex) $\bm{x} \in \mathbb{R}^n$
- Matrices
  - A 2-D array of numbers.
  - ex) $\bm{A} \in \mathbb{R}^{m\times n}$
- Tensors
  - An array with more than two axes.

---

- Transpose
  $$
  \left( \bm{A}^\top \right)_{i,j} = \bm{A}_{j,i} \\
  \left( \bm{A} \bm{B} \right) ^\top = \bm{B}^\top \bm{A}^\top
  $$

  - A transpose of a column vector is a row vector, and vice versa.
  - A transpose of a scalar is itself.