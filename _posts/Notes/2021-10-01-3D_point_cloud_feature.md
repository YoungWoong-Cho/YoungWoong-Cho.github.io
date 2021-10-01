---
layout: posts
title: "3D point cloud features"
sidebar:
  nav: "docs"

use_math: true
excerpt: "Reducing the dimensionality of the 3D point clouds while preserving  its 3-dimensional properties."
header:
  overlay_image: /assets/images/2021-10-01-HD_map/HD_map.jpg
  overlay_filter: 0.5
  caption: "Photo credit: [**Unsplash**](https://unsplash.com/photos/_SFJhRPzJHs)"
---

### Sidenote: how to retain the 3D information of point cloud
Convolutional neural network, or CNN, is useful when the spatial relation of the input data is important. A conventional 2D convolution operation is well suited for 2D inputs, such as images. Applying the idea of CNN to the point clouds is seemingly a nice idea, since spatial relationship among the points are crucial.

However, it turns out that a 3D CNN is an extremely expensive operation. First, different from 2D images, point clouds are "continuous". We can assign an integer tuple to each pixel of the image: e.g. `(120, 300)`. However, each point of the point cloud is associated with a tuple of real numbers: e.g. `(14.0274, -20.844, 2.583)`. A conventional convolution operation cannot be blindly applied here. (Think about it, what would be the size of the kernel, or the stride number?) Therefore, we usually apply **voxelation** in order to turn the continuous 3D space into a discretized grid, so that the convolution operation can be applied.

<figure style="width: 80%" class="align-center">
  <img src="/assets/images/2021-10-01-3D_point_cloud_features/fig1.png" alt="">
  <figcaption><b>Figure 2.</b> Most of the space from the point cloud data obtained from a LiDAR is empty.</figcaption>
</figure> 

Yet, even after we apply voxelation, a convolution operation in 3D space is not desirable, since the point clouds are "sparse" by nature. For images, we have a value assigned to each pixel; however, for point clouds obtained from a LiDAR, most of the space is vacant. Therefore, after we convolve around the kernel, most of the resulting feature map would remain zero. (Since zero times whatever number is zero!)

One possible solution is reducing the unnecessary convolution operation caused by having most of the space filled with zero. Since applying the kernel to the empty space would simply yield zeros, we can apply the convolution operation to the non-zero area only. This is the idea behind the **sparse tensor**, which contains the information of non-zero voxels only, and can be implemented via [**Minkowski Engine**](https://github.com/NVIDIA/MinkowskiEngine). Sparse tensor and Minkowski Engine will be discussed furthur in the following [post](https://youngwoong-cho.github.io).

Another possible solution is, simply reducing the dimensionality to 2D, and applying the conventional 2D convolution operation. This, as pointed out before, requires another step in order to minimize the information loss that is caused by dimension reduction.  
For example, the authors of [**PointPillars: Fast Encoders for Object Detection from Point Clouds**](https://arxiv.org/pdf/1812.05784.pdf) suggest a way of converting the point cloud to a pseudo-image, each of whose pixels is a 9-dimensional vector that includes the height information. More on this paper can be found from the following [post](https://youngwoong-cho.github.io).  
The authors of [**Fast LIDAR-based Road Detection Using Fully Convolutional Neural Networks**](https://arxiv.org/pdf/1703.03613.pdf) state that, after creating a grid in the $x$-$y$ plane, statistics such as mean, standard deviation, minimum, and maximum elevation are computed for each grid. More on this paper can be found from this [post](https://youngwoong-cho.github.io).