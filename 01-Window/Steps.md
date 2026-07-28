

//  Initialization steos 
1. Get GPU interface
const gpu = navigator.gpu;

2. Get GPUAdapter object from  GPU  Interface

Dont wait for the completion of  the GPU task but wait for the CPU command buffer Operation and CPU to GPU data transfer task.

We are not waiting for the GPU to wait to send data across to CPU.

3. Get GPUDevice object from the adapter.

4. As browsers  can be on mobile  devices and other devices. device  may get lost maybe due to reset / switchoff / switching / disconnection

in such circumstances we cannot have  umcapturable error. so register one generic handler for uncapturable error with device. 

5. After receving gpu interface adapter and device get GPUQueue object from device

getting queues is always synchoronous never fails if  we already successfully have  gpu  adapter and device. there is no need  of await and neither error checing 

6. Get WebGPU Context.


7. Get the preferred the WebGPU  color format for the canvas  



8. Configure the canvas  by using  this obtained canvas format to suit  our needs.

9. Define  the clear  color 


// Display
10. get command encoder from the device due  to async nature  and possibility of the  device lost  it  is better to create it per frame in the display

11. Create Render Pass color  attachement of type GPUColorPassRenderAttachement

12. According to above create  render pass Descriptor of type  GPURenderPassDescriptor

13. Start the renderpass 
14. End the renderpass 
15. Finish the command encoder. there can be multiple command encoder we have one.
and submit command encoder or encoders to the queue.

//uninitialize 
16. Use  aniamtion Frame id for  safe  animation cancellation and uninitialize.
17. unconfigure / destroy the context
18 destroy the device