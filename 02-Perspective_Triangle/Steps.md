/**

* @author Yashwant Raut
* @email [example@mail.com]
* @create date 2026-07-28 22:36:18
* @modify date 2026-07-28 22:36:18
* @desc [description]
 */

Steps For perspective triangle in WebGPU

* Add  global variables to  vertex Buffer, uniform buffer, render pipeline, binding group and perspective projection matrix.

* Change in onDeviceLost
nulllify all 5 Global variables

* Changes in initialize

1.Write vertex shader code as string.
2.Create Vertex shader module.
    A. Create shader module descriptor.
    B. Create  actual shader module.
    C. Create fragment shader module.
        a. First create shader module descriptor
        b. Create actual shader module
3.Declare postion array.
4.Create vertex buffer for postion.
    A. Create buffer descriptor
    B. Create  actual vertex buffer for position
    C. Write data (position array to above  created buffer)
    (Will set this position vertex buffer dynamically in display)

5.Now will do uniform plumbing for MVP Uniform
    A. Uniforms will bind  to bind group in shader so create bind  group layout  for  our MVP  uniform
        a. First create bind group layout entry.
        b. Create  bindgroup layout descriptor.
        c. Finally Create  actual bindgroup layout.
        (there  can be  multiple bindgroup layouts according multiple uniforms)
    B. Create pipeline Layout  to specify  one  or many above  bind  groups layout.
        a. First Create pipeline layout  descriptor.
        b. Create  actual pipeline  layout.
    C. Now  create uniform buffer for our uniform buffer
        a. first create buffer descriptor.
        b. Create  actual uniform buffer.
        Note
        ## we will not write data  to uniform biuffer now as uniform buffer can change like in animation we will write data to this buffer  in display.
        ##  or vertex buffer we  set them in display such setting is not necessary for  uniform buffer because  we will put these buffer in bind group and then will set this bind group in display.
    D. As mentioned above now will create that bind group for our mvp uniform buffer
        a.  First we will create buffer binding property
        b.  Create binding group entry for above  buffer binding  property
        c.  Create binding  group  descriptor  to  specify  above  binding group entry
        d.  Now we  will  create the actual binding group.
        Note
        ## Will set this binding group in display.
6.Create render pipeline
    A.  First we will  create render pipeline descriptor (PSO = Pipeline State Object)
        a.  First we will create vertex buffer  layout.
            i. According to the attributes position,color,normal,texcoord we need  vertex attribute for this example we will need only  one vertex attribute i.e for position
            ii. Create actual vertex buffer layout using above one or more  vertex attributes
        b.  We need  vertex shader state which will require above one or more vertex buffer layouts
        c.  Then we will create fragment shader state.
            i.  First create  target color  state.
            ii. Now create  actual fragment shaderstate using above target color  state.
        d.  Creaete primitive state
        e.  Finally  create the render pipeline  descriptor
    B. By using above  PSO  create  the actual render pipeline.
7.Initialze projection matrix

* Changes in resize
below already existing code of  canvas width and height set projection matrix.

* Changes in  display
this changes to be done after the existing the code of renderPassEncoder

1. Transformations
    A.  Create and initialize required matrices here  we need  model  view  matrix  and model view projection matrix
    B.  Do  needed  transformations here  we do  only translation.
    C.  Do matrix multiplicationn to calculate  Model  View Projection Matrix.
    D.  Now write this MVP to the uniform buffer we  created in above 5-> C step.
2. Start the render pass (which is already started in existing code)
3. Set folllowing properties of  renderpass  encoder
    a.  Render pipeline
    b.  Viewport
    c.  scissor  rectangle
    d.  Vertex buffer
    e.  bind group
4. Draw
5. End the  renderpass (which is there in existing code)

* Changes in uninitialize
Below the existing  code  stopping the animation and  destrying the  context  add this changes

1. We already have  device  destruction if  block where  we alredy nullified upto to the  queue on the same line  nullify the new global variables
    A. Vertex buffer
        uniform buffer
        pipeline
        bind  group
    B. As  a  convention thugh not needed nullify the projection matrix
