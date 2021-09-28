---
layout: posts
title: "[Paper Review] Convolutional Recurrent Network for Road Boundary Extraction"
sidebar:
  nav: "docs"

excerpt: "A CNN extracts the location and direction of road boundaries, and a CRNN outputs a polyline representation"
header:
  overlay_image: /assets/images/2021-09-28-Convolutional_Recurrent_Network_for_Road_Boundary_Extraction/header.PNG
  overlay_filter: 0.5
  caption: "Photo credit: [**Unsplash**](https://unsplash.com/photos/8e2gal_GIE8)"
---

### Preliminary
- If you think you are not familiar with **convolutional neural network**, check out this [post](https://www.youtube.com).

---

### Keywords
CNN, HD map, Curb detection, LiDAR, Distance transform, FPN, Skip connections, Dilated convolutional layers, Instance normalization, STN

---
> Extraction of drivable road boundary is important for self-driving cars. In this paper, the authors propose a convolutional recurrent network that extracts the road boundary from LiDAR and camera input.

Before we begin, prepare **a cup of coffee** that will help us through the paper.

# HD map and Curb detection

**High definition map** is a roadmap with accuracy level down to centimeter scales. It contains important information of the static part of the scene, such as drivable area (where the vehicle is allowed to drive), lane lines, crosswalks, stoplines, etc. They are extremely important for perception, path planning, and localization.

<figure style="width: 500px" class="align-center">
  <img src="/assets\images\2021-09-28-Convolutional_Recurrent_Network_for_Road_Boundary_Extraction\fig1.png" alt="">
  <figcaption><b>Figure 1.</b> Here is a sample HD map, from nuScenes map extension. You can see it is annotated with various components such as lane, walkway, stop line, drivable area, etc.</figcaption>
</figure> 

However, annotating HD maps is an awfully laborious task. Imagine annotating tens of millions of points that corresponds to the exact position of the curb, lanes, crosswalks, and so forth. Hence, there have been numerous efforts to automate the map construction process.

In this paper, the authors focus on the extraction of the **drivable area** from LiDAR and camera input, employing the convolutional neural networks(CNN) and convolutional recurrent network(CRNN).

# What are the inputs?
3D point cloud data from LiDAR and 2D imagery from RGB camera are used for the creation of HD map. However, they can not be directly consumed by the model, since the nature of the data from two sensors differ a lot. (How can you directly combine 3-D unordered points from LiDAR and 2-D 3-channel pixels from camera together?)

Thus, the authors create a **bird-eye view(BEV) representations** of the sensor readings and use them as the input to the system. Though not stated explicitely in the paper, a 3-D to 2-D "flattening" of the point cloud data can be easily done by removing the z-axis. Something like `pts_2d = pts_3d[:, :2]`.

At this point, some might argue: "Wait, how can you just remove a dimension? Isn't that kinda... losing some information?" Well, it's correct. Simply removing the lasts column (which is z-coordinates) will lose some data. Therefore, in order not to lose our precious 3-D information, researchers add extra channel to the input tensor of the LiDAR that accounts for the "height" information. 