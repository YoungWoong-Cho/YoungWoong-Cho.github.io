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

Before we begin, you may bring **a cup of coffee** that can help us through the paper.

***

# Overview
In this paper, the authors propose a neural network that extracts the drivable road boundary from LiDAR and camera image input.

> Extraction of drivable road boundary is important for self-driving cars. In this paper, the authors propose a convolutional recurrent network that extracts the road boundary from LiDAR and camera input.

### Preliminary
If you are not familiar with the followings, check out the blog posts. 
- [HD map](https://youngwoong-cho.github.io/HD_map)
- [Convolutional Neural Network](https://youngwoong-cho.github.io/CNN)
- [Feature Pyramid Networks](https://youngwoong-cho.github.io/FPN)
- [Spatial Transformer Networks](https://youngwoong-cho.github.io/STN)

### Keywords
CNN, HD map, Curb detection, LiDAR, Distance transform, FPN, Skip connections, Dilated convolutional layers, Instance normalization, STN

---

# HD map and Curb detection

As we have discussed about HD maps (High Definition maps) in the [post](https://youngwoong-cho.github.io/HD_map), one of the limitations of HD map is that its annotation is awfully laborious. Hence, there have been numerous efforts to automate the map construction process.

In this paper, the authors focus on the **extraction of the drivable area from LiDAR and camera input**, employing the convolutional neural networks (CNN) and convolutional recurrent network (CRNN).

<figure style="width: 80%" class="align-center">
  <img src="/assets\images\2021-09-28-Convolutional_Recurrent_Network_for_Road_Boundary_Extraction\fig1.png" alt="">
  <figcaption><b>Figure 1.</b> Here is a sample HD map, from <i>nuScenes map expansion</i>. It contains various annotations such as lane, walkway, stop line, drivable area, etc.</figcaption>
</figure> 

# What are the inputs?
3D point cloud data from LiDAR and 2D imagery from RGB camera are used for the creation of HD map. However, they can not be directly consumed by the model, since the nature of the data from two sensors differ a lot. (How can you directly combine 3D unordered points from LiDAR and 2D 3-channel pixels from camera together?)

Thus, the authors create **bird-eye view (BEV) representations** of the sensor readings and use them as the input to the system. Though not stated explicitely in the paper, a 3D to 2D "flattening" of the point cloud data can be easily done by removing the z-axis — something like, `pts_2d = pts_3d[:, :2]`.

At this point, some might argue: "Wait, how can you just remove a dimension? Doesn't that kinda... lose some information?" Well, that's completely correct. Simply removing the last column (which is z-coordinates) will lose some data. Therefore, in order to keep our precious 3D information, one or more additional channels are usually added to the input tensor of the LiDAR so that the "height" information can be preserved.

### Sidenote: how to retain the 3D information of point cloud
Convolutional neural network, or CNN, is useful when the spatial relation of the input data is important. A conventional 2D convolution operation is well suited for 2D inputs, such as images. Applying the idea of CNN to the point clouds is seemingly a nice idea, since spatial relationship among the points are crucial.

However, it turns out that a 3D CNN is an extremely expensive operation. First, different from 2D images, point clouds are "continuous". We can assign an integer tuple to each pixel of the image: e.g. `(120, 300)`. However, each point of the point cloud is associated with a tuple of real numbers: e.g. `(14.0274, -20.844, 2.583)`. A conventional convolution operation cannot be blindly applied here. (Think about it, what would be the size of the kernel, or the stride number?) Therefore, we usually apply **voxelation** in order to turn the continuous 3D space into a discretized grid, so that the convolution operation can be applied.

<figure style="width: 80%" class="align-center">
  <img src="/assets\images\2021-09-28-Convolutional_Recurrent_Network_for_Road_Boundary_Extraction\fig2.png" alt="">
  <figcaption><b>Figure 2.</b> Most of the space from the point cloud data obtained from a LiDAR is empty.</figcaption>
</figure> 

Yet, even after we apply voxelation, a convolution operation in 3D space is not desirable, since the point clouds are "sparse" by nature. For images, we have a value assigned to each pixel; however, for point clouds obtained from a LiDAR, most of the space is vacant. Therefore, after we convolve around the kernel, most of the resulting feature map would remain zero. (Since zero times whatever number is zero!)

One possible solution is reducing the unnecessary convolution operation caused by having most of the space filled with zero. Since applying the kernel to the empty space would simply yield zeros, we can apply the convolution operation to the non-zero area only. This is the idea behind the **sparse tensor**, which contains the information of non-zero voxels only, and can be implemented via [**Minkowski Engine**](https://github.com/NVIDIA/MinkowskiEngine). Sparse tensor and Minkowski Engine will be discussed furthur in the following [post](https://youngwoong-cho.github.io).

Another possible solution is, simply reducing the dimensionality to 2D, and applying the conventional 2D convolution operation. This, as pointed out before, requires another step in order to minimize the information loss that is caused by dimension reduction.  
For example, the authors of [**PointPillars: Fast Encoders for Object Detection from Point Clouds**](https://arxiv.org/pdf/1812.05784.pdf) suggest a way of converting the point cloud to a pseudo-image, each of whose pixels is a 9-dimensional vector that includes the height information. More on this paper can be found from the following [post](https://youngwoong-cho.github.io).  
The authors of [**Fast LIDAR-based Road Detection Using Fully Convolutional Neural Networks**](https://arxiv.org/pdf/1703.03613.pdf) state that, after creating a grid in the $x$-$y$ plane, statistics such as mean, standard deviation, minimum, and maximum elevation are computed for each grid. More on this paper can be found from this [post](https://youngwoong-cho.github.io).

The authors of Convolutional Recurrent Network for Road Boundary Extraction adopted the latter solution of adding extra channels:

> We also input as an extra channel the gradient of the LiDAR’s height value. This input channel is very informative since the drivable and non-drivable regions of the road in a city are mostly flat surfaces at different heights that are separated by a curb.

Long story short, the point cloud data from LiDAR is projected onto the grid in the $x$-$y$ plane, and to each pixel the intensity and the gradient of the height value are assigned. This is then concatenated with the corresponding RGB image, resulting in a 5-dimensional input image. Mathematically speaking, each input tensor is

$$
I \in \mathbb{R}^{5 \times H \times W}
$$

where $H$ and $W$ is the height and the width of the input image.

# What is the desired output?
For a given input $I \in \mathbb{R}^{5 \times H \times W}$, the desired output is a list of **vectorized road boundary**. Each road boundary is a polyline, which basically is a ordered list of $\left(x, y\right)$ coordinates.  
Mathematically speaking, the output $O$ can be expressed as

$$
O = \left\{O_i\right\} \quad \text{with} \quad O_i = \left\{p_j | p_j \in \mathbb{R}^2\right\}
$$

or, in a more computer science format,
```
output = [[(x0_0, y1_0), (x0_1, y0_1), ...],
          [(x1_0, y1_0), (x1_1, y1_1), ...],
          ...
          [(xi_0, yi_0), (xi_1, yi_1), ...],
          ...
          [(xn_0, yn_0), (xn_1, yn_1), ...]]
```
Notice that the output is a list of **polylines**. A polyline is an ordered set of point, which when connected sequentially, produces a line of interest.

# So, what's the plan?
Remember that the desired output is in a vector, not a raster. In other words, we want a set of point coordinates instead of pixels on the images. However, CNN is designed for the images, since it applies the weights and biases to the pixels.  
**So, here' the plan**: we will train the model that outputs one or more feature maps (since feature maps are "images"), and we are going to apply another algorithm that generates a set of point coordinates from the feature maps. Easy, right? But, what kind of feature map are we looking for? In other words, what kind of images do we expect our model to translate the input image into?

One can conclude that the feature maps should have properties that are useful for the extraction of the polylines. The authors suggest three feature maps: **detection map**, **direction map**, and **endpoint map**. The authors denote each map as $S$, $D$, and $E$, respectively.

Let us take a look at each of the feature maps.

## Detection map: how much more should I go?
First, a **detection map**. Authors define a detection map to be an **inverse truncated distsance transform image**.  
"A... what?"  
Don't worry. Let me paraphrase it for you.

A **distance transform**, or a distance map, is a map where each pixel represents the distance to the nearest boundary pixel. Take a look at the figure below.

<figure style="width: 80%" class="align-center">
  <img src="/assets/images/2021-09-28-Convolutional_Recurrent_Network_for_Road_Boundary_Extraction/distance_transform.gif" alt="">
  <figcaption><b>Figure 3.</b> A binary image (left) and a corresponding distance transform (right). Each pixel in the distance transform indicate the distance to the nearest boundary.</figcaption>
</figure>

When using a distance transform, an appropriate metric for the distance should be chosen. For example, if you are an authentic engineer, you can measure a distance using the good old **Euclidean distance**; if you are a big fan of *Piet Mondrian*, then you can go with **Manhattan distance**; or if you are a professional chess player, you can try a **Chessboard distance**.

One more thing about the distance transform; a **signed distance transform** is a distance transform with signs. It has positive values at points inside the boundary, and negative values at points outside the boundary. On the boundary, the values are zero.

So... back to the detection map. The detection map can say something about the location of the curb. For example, if you are at pixel `(250, 130)`, and the detection map has a value of `10`, then you can tell that you are 10 units away from the nearest curb.

But be careful, the authors didn't use vanilla distance transform. They used the *inverse truncated* distance transform. They used **inverse** distance transform because they wanted the values to be the maximum at the curb. Also, they used the **truncated** distance transform so that the points that are further away than the threshold distance have the value of zero.

Note that the detection map is a **scalar field**, *i.e.*,

$$
S \in \mathbb{R}^{1 \times H \times W}
$$

Suppose our model did a good job on predicting the inverse truncated distance transform image. Then we can generate the polyline by finding the points that maximizes the detection map values.

Why would we want to invert the values of the detection map? The reason will become clear when we move on to the direction map.

## Direction map: where should I go from here?
Let's say we have successfully generated a detection map. It means for each pixel on the BEV image, we know how far we are from the nearest curb. However, that is not what we want. At the end of the day, we want to find the exact location of the curb in a form of polyline. Thus, we need an information of where to move in order to find a curb.

Intuitively, we can take a partial derivative of the detection map with respect to each direction — or, take the **gradient** ($\nabla$) of the direction map — in order to obtain the direction map.

Note that the result of gradient operation is a vector; thus, the authors stipulate that the direction map is a **vector field**, *i.e.*,

$$
D \in \mathbb{R}^{2 \times H \times W}
$$

How do we take the gradient of an image? We can implement a partial derivative operation, but we already have a splendid kernel that does the task that we're after, namely, the **Sobel filter**. The Sobel filter is a special type of a filter used in CNN, which is particularly used for the edge detection. It is a discrete differentiation operator, which computes an approximation of the gradient of the pixel value of the image. The authors state that they have used the Sobel derivative to obtain the direction map.
>We obtain the ground truth by taking the Sobel derivative of the road boundaries’ distance transform image followed by a normalization step.

*Aha*, now we understand why the authors used the *inverse* distance transform. **If we take the sobel derivative of the inverse distance transform, the direction would be naturally pointing towards the nearest curb**, since the direction of the gradient vector is always heading towards where the value increases the most rapidly.

### Quick tip for Physics students
If you are a Physics student and are familiar with the field theory, you can think of a distance map as a potential field and a direction map as a force field.

Also, Bear in mind that the *detection map* is the inverse distance map, so we don't have to account for the negative sign in front of the following relationship:

$$
\vec{F} = - \vec{\nabla} \cdot U
$$


## Endpoint map: where should the curb begin?
Lastly, we need a point from which we can begin constructing the polyline. The authors propose to use a heatmap that encodes the probability of each pixel of being an endpoint. In other words, each pixel of the endpoints heatmap stores a value between 0 and 1, which tells the probability of the pixel of being an endpoint; if the point can function as an endpoint, it will have a value close to 1; if not, it will have a value close to 0.

Also note that the endpoint heatmap has a dimesionality of

$$
E \in \mathbb{R}^{1 \times H \times W}
$$


### Why use detection map and direction map, if we can use heatmap for all?
At this point, a question might arise in reader's mind.

"If we can generate a heatmap/binary map that encodes the probabiliry of each point belonging to the curb, shouldn't that to the work? We might just have to connect the points where the probability is higher than the threshold."

Well, the reason we want to output the detection map and the direction map is that, they are **dense maps** and thus **can encode more information about the locations of the road boundaries**. According to the authors,

> In contrast to predicting binary outputs at the road boundary pixels which are very sparse, the truncated inverse distance transforms encodes more information about the locations of the road boundaries.

There are many cases in reality where the location of the curb should be inferred from the context. For example, in most cases, there will be a huge change in height at the curbsides. However, this might not be true for some cases, such as at the crosswalks, roll curbs, or curb ramps. The curb might simply be under construction or is partially destroyed. For such cases, the deep learning model should be able to think from the context, which a binary map or a heatmap cannot provide.

Suppose you are provided with a binary map, or a heatmap that encodes the location of the curbside. Your task is to find a polyline of the curbs. You might first connect the *obvious* points, *i.e.*, where the binary map is `1` or where the heatmap is close to `1`.

But, what next? The distribution of the `1`s is likely to be pretty noisy. Here is where the contextual reasoning comes into play. You can do something like:  
*"Well, since I have a chunk of points from which I deduced one line segment here, and another over there, and they kinda look like they belong to the same curb, lemme connect these two to continue my polyline."*  
This is exactly what we expect our model would be doing. Or, at least similar to what we are expecting from the model. The *kinda look like they belong to the same curb* part is taken care by the detection map and direction map, since the contextual information that each pixel of the feature map is holding can tell if the line segment here and there belong to the same curb.

# Network architecture
