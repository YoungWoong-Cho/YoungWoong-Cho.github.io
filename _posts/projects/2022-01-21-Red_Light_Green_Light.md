---
layout: posts
title: "Red Light Green Light- A Robot from Squid Game"
sidebar:
  nav: "docs"

use_math: true
excerpt: "Develop an AI software that plays Red Light Green Light"
header:
  overlay_image: /assets/images/2021-05-15-ViDI/header.png
  overlay_filter: 0.5
---

Project Team member: Youngwoong Cho, Woosang Kang, Hogan Kim, Sebeom Lee

You can see the video from [**youtube**](https://youtu.be/09M4UaBqaHE).

# Introduction
> Can we develop an AI that can play the Red-Light-Green-Light game from the *Squid Game*?

A deep neural network pipeline was designed to play the Red-Light-Green-Light game from the *Squid Game*.

**OpenCV** algorithm that computes the absolute difference between current and previous frame is used for the motion detection module.

**Mask-RCNN** is used for the instance segmentation module.

**MTCNN** network is used for the facial detection module.

A pre-trained **InceptionResnet** is used for the facial recognition module.

# Process
## Problem definition
From a periodic image input from a webcam, we want to extract a face of a person whose motion is detected.

## Motion detection


## Instance segmentation


## Facial detection


## Facial recognition


# Result
