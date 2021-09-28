---
layout: posts
title: "[Paper Review] Convolutional Recurrent Network for Road Boundary Extraction"
sidebar:
  nav: "docs"

use_math: true
excerpt: "A CNN extracts the location and direction of road boundaries, and a CRNN outputs a polyline representation"
header:
  overlay_image: /assets/images/2021-09-28-Convolutional_Recurrent_Network_for_Road_Boundary_Extraction/header.PNG
  overlay_filter: 0.5
  caption: "Photo credit: [**Unsplash**](https://unsplash.com/photos/8e2gal_GIE8)"
---

### Preliminary
- If you are not familiar with **convolutional neural network**, check out this [post](https://www.youtube.com).

---

### Keywords
CNN, HD map, Curb detection, LiDAR, Distance transform, FPN, Skip connections, Dilated convolutional layers, Instance normalization, STN

---
> Extraction of drivable road boundary is important for self-driving cars. In this paper, the authors propose a convolutional recurrent network that extracts the road boundary from LiDAR and camera input.

Before we begin, prepare **a cup of coffee** that will help us through the paper.

# HD map and Curb detection

**High definition map** is a roadmap with accuracy level down to centimeter scales. It contains important information of the static part of the scene, such as drivable area, lane lines, crosswalks, stoplines, etc. They are extremely important for perception, path planning, and localization.

<figure style="width: 80%" class="align-center">
  <img src="/assets\images\2021-09-28-Convolutional_Recurrent_Network_for_Road_Boundary_Extraction\fig1.png" alt="">
  <figcaption><b>Figure 1.</b> Here is a sample HD map, from <i>nuScenes map expansion</i>. It contains various annotations such as lane, walkway, stop line, drivable area, etc.</figcaption>
</figure> 

However, annotating HD maps is an awfully laborious task. Imagine labeling tens of millions of points that corresponds to the exact position of the curb, lanes, crosswalks, and so forth. Hence, there have been numerous efforts to automate the map construction process.

In this paper, the authors focus on the extraction of the **drivable area** from LiDAR and camera input, employing the convolutional neural networks (CNN) and convolutional recurrent network (CRNN).

# What are the inputs?
3D point cloud data from LiDAR and 2D imagery from RGB camera are used for the creation of HD map. However, they can not be directly consumed by the model, since the nature of the data from two sensors differ a lot. (How can you directly combine 3D unordered points from LiDAR and 2D 3-channel pixels from camera together?)

Thus, the authors create **bird-eye view (BEV) representations** of the sensor readings and use them as the input to the system. Though not stated explicitely in the paper, a 3D to 2D "flattening" of the point cloud data can be easily done by removing the z-axis — something like, `pts_2d = pts_3d[:, :2]`.

At this point, some might argue: "Wait, how can you just remove a dimension? Isn't that kinda... losing some information?" Well, it's correct. Simply removing the last column (which is z-coordinates) will lose some data. Therefore, in order to keep our precious 3D information, one or more additional channels are usually added to the input tensor of the LiDAR so that the "height" information can be preserved.

### Sidenote: how to retain the 3D information of point cloud
Convolutional neural network, or CNN, is useful when the spatial relation of the input data is important. A conventional 2D convolution operation is well suited for 2D inputs, such as images. Applying the idea of CNN to the point clouds is seemingly a nice idea, since spatial relationship among the points are crucial.

However, it turns out that a 3D CNN is an extremely expensive operation. First, different from 2D images, point clouds are "continuous". We can assign an integer tuple to each pixel of the image: e.g. `(120, 300)`. However, each point of the point cloud is associated with a tuple of real numbers: e.g. `(14.0274, -20.844, 2.583)`. A conventional convolution operation cannot be blindly applied here. (Think about it, what would be the size of the kernel, or the stride number?) Therefore, we usually apply **voxelation** in order to turn the continuous 3D space into a discretized grid, so that the convolution operation can be applied.

<figure style="width: 80%" class="align-center">
  <img src="/assets\images\2021-09-28-Convolutional_Recurrent_Network_for_Road_Boundary_Extraction\fig2.png" alt="">
  <figcaption><b>Figure 2.</b> Most of the space from the point cloud data obtained from a LiDAR is empty.</figcaption>
</figure> 

Yet, even after we apply voxelation, a convolution operation in 3D space is not desirable, since the point clouds are "sparse" by nature. For images, we have a value assigned to each pixel; however, for point clouds obtained from a LiDAR, most of the space is vacant. Therefore, after we convolve around the kernel, most of the resulting feature map would remain zero. (Since zero times whatever number is zero!)

One possible solution is reducing the unnecessary convolution operation caused by having too much of zeros. Since applying the kernal to the empty space would simply yield zeros, we can apply the convolution operation to the non-zero area only. This is the idea behind the **sparse tensor**, which contains the information of non-zero voxels only, and can be implemented via [**Minkowski Engine**](https://github.com/NVIDIA/MinkowskiEngine). Sparse tensor and Minkowski Engine will be discussed furthur in the following [post](https://youngwoong-cho.github.io).

Another possible solution is, simply reducing the dimensionality to 2D, and applying the conventional 2D convolution operation. This, as pointed out above, requires another step in order to minimize the information loss that is caused by dimension reduction.
For example, the authors of [**PointPillars: Fast Encoders for Object Detection from Point Clouds**](https://arxiv.org/pdf/1812.05784.pdf) suggests a way of converting the point cloud to a pseudo-image, each of whose pixels is a 9-dimensional vector that includes the $z$ coordinate. including the height information. More on the paper above can be found from the following [post](https://youngwoong-cho.github.io).
The authors of [**Fast LIDAR-based Road Detection Using Fully Convolutional Neural Networks**](https://arxiv.org/pdf/1703.03613.pdf) state that, after creating a grid in the $x$-$y$ plane, statistics such as mean, standard deviation, minimum, and maximum elevation are computed for each grid. More on the paper above can be found from this [post](https://youngwoong-cho.github.io).

The authors of Convolutional Recurrent Network for Road Boundary Extraction adopted the latter solution of adding extra channels:

> We also input as an extra channel the gradient of the LiDAR’s height value. This input channel is very informative since the drivable and non-drivable regions of the road in a city are mostly flat surfaces at different heights that are separated by a curb.

Long story short, the point cloud data from LiDAR is projected onto the grid in the $x$-$y$ plane, and to each pixel the intensity and the gradient of the height value are assigned. This is then concatenated with the correspponding RGB image, resulting in a 5-dimensional input image.