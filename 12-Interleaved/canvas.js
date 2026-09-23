/**
 * @author Yashwant Raut
 * @email [example@mail.com]
 * @create date 2026-09-23 22:32:26
 * @modify date 2026-09-23 22:32:26
 * @desc [description]
 */



//global variables 

var canvas = null;
var bFullScreen = false;
var canvas_original_width;
var canvas_original_height;

//webgpu  related 
var clear_color

let device = null;
let context = null;
let queue = null;
let canvasFormat = null;
let animationFrameId = null;

// Added in 02-Perspective_Triangle 

let render_pipeline = null;
let buffer_uniform = null;
let bindingGroup_uniform = null;
let perspectiveProjectionMatrix = null;
let depthTexture = null;

//for cube
let buffer_interleaved = null;
let texture_marble = null;
let sampler_marble = null;
let bindingGroup_texutre_and_sampler = null;
var angleCube = 0.0;


//Added in 10-Light-Per-Vertex
var lightAmbient = new Float32Array([0.1, 0.1, 0.1, 0.0]);
var lightDiffuse = new Float32Array([1.0, 1.0, 1.0, 0.0]);
var lightSpecular = new Float32Array([1.0, 1.0, 1.0, 0.0]);
var lightPosition = new Float32Array([100.0, 100.0, 100.0, 1.0]);

var materialAmbient = new Float32Array([0.0, 0.0, 0.0, 0.0]);
var materialDiffuse = new Float32Array([0.5, 0.2, 0.7, 0.0]);
var materialSpecular = new Float32Array([0.7, 0.7, 0.7, 0.0]);
var materialShininess = new Float32Array([128.0, 0.0, 0.0, 0.0]);
var lKeyPressed = new Uint32Array([0, 0, 0, 0]); //first x is light is off so it is 0

var isLightingEnabled = false;




//how to start animation: to have requestAnimationFrame() to be called "crossbrowser" compatible
var requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame;


//To Stop animation : To have cancelAnimationFrame() to be calles "crossbrowser" compatible
var cancelAnimationFrame = window.cancelAnimationFrame ||
    window.webkitCancelRequestAnimationFrame || window.webkitCancelAnimationFrame ||
    window.mozCancelRequestAnimationFrame || window.mozCancelAnimationFrame ||
    window.oCancelRequestAnimationFrame || window.oCancelAnimationFrame ||
    window.msCancelRequestAnimationFrame || window.msCancelAnimationFrame;


// Asynchronous communication between the JavaScript thread and the GPU to avoid long waits for GPU completion
async function main(params) {

    canvas = document.getElementById("AMC");
    if (!canvas)
        console.log("Obtaining Canvas Failed \n");
    else
        console.log("Obtaining Canvas Succeeded \n");

    //print canvas width and height on console 
    console.log("Canvas Width:" + canvas.width + "Canvas Height:" + canvas.height);

    canvas_original_width = canvas.width;
    canvas_original_height = canvas.height;

    //Register Event Handler
    window.addEventListener("keydown", keyDown, false);
    window.addEventListener("click", mousedown, false);
    window.addEventListener("resize", resize, false);

    // Best practices for WebGPU during fullscreen 
    document.addEventListener('fullscreenchange', onFullScreenChange, false);
    document.addEventListener('webkitfullscreenchange', onFullScreenChange, false);

    // 1. initialize WebGPU
    const gpu = navigator.gpu;

    if (gpu == null) {
        console.log('WebGPU not supported on this browser \n');
        throw Error('WebGPU not supported on this browser \n')
    } else {
        console.log('WebGPU is supported on this browser \n');
    }

    // 2. Get GPUAdapter object from  GPU  Interface
    const adapter = await gpu.requestAdapter();
    if (adapter == null) {
        console.log('Failed  to retrieve  adapter from gpu  interface \n');
        throw Error('Failed  to retrieve  adapter from gpu  interface \n')
    } else {
        console.log('Successfully retrieved  adapter from gpu  interface \n');
    }

    // 3.  Get GPUDevice object from the adapter
    device = await adapter.requestDevice();
    if (device == null) {
        console.log('Failed  to retrieve  device from adapter \n');
        throw Error('Failed  to retrieve  device from adapter \n');
    }
    else {
        console.log('Successfully retrieved  device from adapter \n');
    }

    device.addEventListener('uncapturederror', onUncapturedError);

    // register a specific device lost event handler

    device.lost.then(onDeviceLost);

    // call stub functions from here  
    initialize();
    resize();
    display();

}

function onUncapturedError(event) {
    console.error("WebGPU uncaptured error:", event.Error.message);
}


function toggleFullScreen() {
    //code
    var fullscreen_element = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || null;
    console.log("fullscreen_element:", fullscreen_element);
    //if not fullscreen
    if (fullscreen_element == null) {
        if (canvas.requestFullscreen)
            canvas.requestFullscreen();
        else if (canvas.mozRequestFullScreen)
            canvas.mozRequestFullScreen();
        else if (canvas.webkitRequestFullscreen)
            canvas.webkitRequestFullscreen();
        else if (canvas.msRequestFullscreen)
            canvas.msRequestFullscreen();
        // in WebGL we initialized bFullScreen here not thinking about  async operation but in WebGPU  considering possibility  async behaviour  of fullscreen  in cross browser compatibilty 
    }
    else {
        if (document.exitFullscreen)
            document.exitFullscreen();
        else if (document.mozCancelFullScreen)
            document.mozCancelFullScreen();
        else if (document.webkitExitFullscreen)
            document.webkitExitFullscreen();
        else if (document.msExitFullscreen)
            document.msExitFullscreen();
        // in WebGL we initialized bFullScreen here not thinking about  async operation but in WebGPU  considering possibility  async behaviour  of fullscreen  in cross browser compatibilty 

    }
}

function onFullScreenChange() {
    //code 
    var fullscreen_element = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || null;

    console.log("onFullScreenChange: fullscreen_element:", fullscreen_element);
    if (fullscreen_element !== null) {
        bFullScreen = true;
    } else {
        bFullScreen = false;
    }
    resize();
}

function initialize() {

    queue = device.queue;

    console.log('webgpu queue  is obtained successfully');

    //now get the webGPU context 
    context = canvas.getContext('webgpu');

    if (context == null) {
        console.log("failed to get the rendering context foe WebGPU");
        throw Error('failed to get the rendering context foe WebGPU')
    }

    // Get the preferred WebGPU color format for the canvas. 
    canvasFormat = navigator.gpu.getPreferredCanvasFormat();

    // 8. Configure the canvas  by using  this obtained canvas format to suit  our needs.
    const canvasConfiguration = {
        device: device,
        format: canvasFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
        alphaMode: "opaque"
    };

    context.configure(canvasConfiguration);
    console.log('canvas configuration is done successfully for WebGPU with format:', canvasFormat, "\n");

    // Added in  02-Perspective_Triangle 
    //1.Write vertex shader code as string.
    // vertex shader code in WGSL
    const vertexShaderSourceCode =
        "struct MyUniformData" +
        "{" +
        "modelMatrix : mat4x4<f32>," +
        "viewMatrix : mat4x4<f32>," +
        "projectionMatrix : mat4x4<f32>," +
        "lightAmbient : vec4<f32>," +
        "lightDiffuse : vec4<f32>," +
        "lightSpecular : vec4<f32>," +
        "lightPosition : vec4<f32>," +
        "materialAmbient : vec4<f32>," +
        "materialDiffuse : vec4<f32>," +
        "materialSpecular : vec4<f32>," +
        "materialShininess : vec4<f32>," +
        "lKeyisPressed : vec4<u32>" +
        "};" +
        "struct VertexOutput" +
        "{" +
        "@builtin(position) position: vec4<f32>," +
        "@location(0) transformedNormal:vec3<f32>," +
        "@location(1) lightDirection:vec3<f32>," +
        "@location(2) viewerVector:vec3<f32>" +
        "};" +
        "@group(0) @binding(0) var<uniform> uMyUniformData : MyUniformData;" +
        "@vertex" + // vertex shader entry point and shader type
        "\n" +
        "fn main(@location(0) vPos : vec3<f32>,@location(1) vNormal : vec3<f32>) -> VertexOutput" + // vertex shader main function -> means return type is vec4<f32> and it is a builtin position variable
        "{" +
        "var output : VertexOutput;" +
        "if(uMyUniformData.lKeyisPressed.x == 1u)" + // WGSL is strictyl typed with no implicit type conversion or promotion so we have to use 1u for unsigned int 1
        "{" +
        "let eyeCoordinates : vec4<f32> = uMyUniformData.viewMatrix * uMyUniformData.modelMatrix * vec4<f32>(vPos,1.0);" +
        "let modelViewMatrix: mat3x3<f32> = mat3FromMat4( uMyUniformData.viewMatrix * uMyUniformData.modelMatrix );" +
        "let normalMatrix: mat3x3<f32> = transpose(inverse3x3(modelViewMatrix));" +
        "output.transformedNormal =  normalize(normalMatrix * vNormal);" +
        "output.lightDirection = normalize(uMyUniformData.lightPosition.xyz - eyeCoordinates.xyz);" +
        "output.viewerVector = normalize(-eyeCoordinates.xyz);" +
        "}" +
        "output.position = uMyUniformData.projectionMatrix * uMyUniformData.viewMatrix * uMyUniformData.modelMatrix * vec4<f32>(vPos,1.0);" +
        "return output;" +
        "}" +
        "fn mat3FromMat4(m:mat4x4<f32>)->mat3x3<f32>" +
        "{" +
        "return(mat3x3<f32>(m[0].xyz, m[1].xyz, m[2].xyz));" +
        "}" +
        // *******************************************************************


        // inverse
        "fn inverse3x3(m:mat3x3<f32>)->mat3x3<f32>" +
        "{" +
        "let determinant = m[0][0] * (m[1][1]*m[2][2] - m[2][1]*m[1][2]) - " +
        "                  m[1][0] * (m[0][1]*m[2][2] - m[2][1]*m[0][2]) + " +
        "                  m[2][0] * (m[0][1]*m[1][2] - m[1][1]*m[0][2]);" +
        "let inverse_determinant = 1.0 / determinant;" +
        "let column0 = vec3<f32>" +
        "(" +
        "    (m[1][1]*m[2][2] - m[2][1]*m[1][2]) * inverse_determinant," +
        "    (m[2][1]*m[0][2] - m[0][1]*m[2][2]) * inverse_determinant," +
        "    (m[0][1]*m[1][2] - m[1][1]*m[0][2]) * inverse_determinant" +
        ");" +
        "let column1 = vec3<f32>" +
        "(" +
        "    (m[2][0]*m[1][2] - m[1][0]*m[2][2]) * inverse_determinant," +
        "    (m[0][0]*m[2][2] - m[2][0]*m[0][2]) * inverse_determinant," +
        "    (m[1][0]*m[0][2] - m[0][0]*m[1][2]) * inverse_determinant" +
        ");" +
        "let column2 = vec3<f32>" +
        "(" +
        "    (m[1][0]*m[2][1] - m[2][0]*m[1][1]) * inverse_determinant," +
        "    (m[2][0]*m[0][1] - m[0][0]*m[2][1]) * inverse_determinant," +
        "    (m[0][0]*m[1][1] - m[1][0]*m[0][1]) * inverse_determinant" +
        ");" +
        "return(mat3x3<f32>(column0, column1, column2));" +
        "}";
    // *******************************************************************



    // 2.Create Vertex shader module. GPUShaderModuleDescriptor
    // A. Create shader module descriptor.
    const shaderModuleDescriptor_vertexShader =
    {
        code: vertexShaderSourceCode
    };

    // B. Create  actual shader module. GPUShaderModule
    const shaderModule_vertexShader = device.createShaderModule(shaderModuleDescriptor_vertexShader);

    if (shaderModule_vertexShader == null) {
        console.log("Failed to create vertex shader module \n");
        throw Error("Failed to create vertex shader module \n");
    } else {
        console.log("Vertex shader module is created successfully \n");
    }

    // fragment shader code in WGSL
    const fragmentShaderSourceCode =
        "struct MyUniformData" +
        "{" +
        "modelMatrix : mat4x4<f32>," +
        "viewMatrix : mat4x4<f32>," +
        "projectionMatrix : mat4x4<f32>," +
        "lightAmbient : vec4<f32>," +
        "lightDiffuse : vec4<f32>," +
        "lightSpecular : vec4<f32>," +
        "lightPosition : vec4<f32>," +
        "materialAmbient : vec4<f32>," +
        "materialDiffuse : vec4<f32>," +
        "materialSpecular : vec4<f32>," +
        "materialShininess : vec4<f32>," +
        "lKeyisPressed : vec4<u32>" +
        "};" +
        "struct VertexOutput" +
        "{" +
        "@builtin(position) position: vec4<f32>," +
        "@location(0) transformedNormal:vec3<f32>," +
        "@location(1) lightDirection:vec3<f32>," +
        "@location(2) viewerVector:vec3<f32>" +
        "};" +
        "@group(0) @binding(0) var<uniform> uMyUniformData : MyUniformData;" +
        "@fragment" + // vertex shader entry point and shader type
        "\n" +
        "fn main(output: VertexOutput) -> @location(0) vec4<f32>" +  //this is output color of fragment shader  
        "{" +
        "var phong_ads_color : vec3<f32>;" +
        "if(uMyUniformData.lKeyisPressed.x == 1u)" +
        "{" +
        "let normalized_transformedNormal : vec3<f32> = normalize(output.transformedNormal);" +
        "let normalized_lightDirection : vec3<f32> = normalize(output.lightDirection);" +
        "let normalized_viewerVector : vec3<f32> = normalize(output.viewerVector);" +
        "let ambient : vec3<f32> = uMyUniformData.lightAmbient.xyz * uMyUniformData.materialAmbient.xyz;" +
        "let diffuse : vec3<f32> = uMyUniformData.lightDiffuse.xyz * uMyUniformData.materialDiffuse.xyz * max(dot(normalized_lightDirection,normalized_transformedNormal),0.0);" +
        "let reflectionVector : vec3<f32> = reflect(-normalized_lightDirection,normalized_transformedNormal);" +
        "let specular : vec3<f32> = uMyUniformData.lightSpecular.xyz * uMyUniformData.materialSpecular.xyz * pow(max(dot(reflectionVector,normalized_viewerVector),0.0),uMyUniformData.materialShininess.x);" +
        "phong_ads_color = ambient + diffuse + specular;" +
        "}" +
        "else" +
        "{" +
        "phong_ads_color = vec3<f32>(1.0,1.0,1.0);" +
        "}" +
        "return  vec4<f32>(phong_ads_color,1.0);" +
        "}";

    // 2.Create Fragment shader module. GPUShaderModuleDescriptor
    // A. Create shader module descriptor.
    const shaderModuleDescriptor_fragmentShader =
    {
        code: fragmentShaderSourceCode
    };

    // B. Create  actual shader module. GPUShaderModule
    const shaderModule_fragmentShader = device.createShaderModule(shaderModuleDescriptor_fragmentShader);

    if (shaderModule_fragmentShader == null) {
        console.log("Failed to create Fragment shader module \n");
        throw Error("Failed to create Fragment shader module \n");
    } else {
        console.log("Fragment shader module is created successfully \n");
    }



    sphere = new Mesh();
    makeSphere(sphere, 2.0, 30, 30);
    numMeshIndices = sphere.getIndexCount();
    console.log("Sphere Geometrty = Vertex Count = ", sphere.getVertexCount(), "Index Count = ", numMeshIndices, "\n");

    const meshData = sphere.getMeshData();

    //create Vertex Buffer for position, normal, texcoord and element array buffer for indices
    buffer_position = createVertexBuffer(meshData.verticesArray);

    if (buffer_position == null) {
        console.log("Failed to create vertex buffer for position \n");
        throw Error("Failed to create vertex buffer for position \n");
    } else {
        console.log("Vertex buffer for position is created successfully \n");
    }


    buffer_normal = createVertexBuffer(meshData.normalsArray);
    if (buffer_normal == null) {
        console.log("Failed to create vertex buffer for normal \n");
        throw Error("Failed to create vertex buffer for normal \n");
    } else {
        console.log("Vertex buffer for normal is created successfully \n");
    }

    buffer_texcoord = createVertexBuffer(meshData.texCoordsArray);
    if (buffer_texcoord == null) {
        console.log("Failed to create vertex buffer for texcoord \n");
        throw Error("Failed to create vertex buffer for texcoord \n");
    } else {
        console.log("Vertex buffer for texcoord is created successfully \n");
    }

    buffer_element = createIndexBuffer(meshData.indicesArray);
    if (buffer_element == null) {
        console.log("Failed to create index buffer for element \n");
        throw Error("Failed to create index buffer for element \n");
    } else {
        console.log("Index buffer for element is created successfully \n");
    }


    // 5.Now will do uniform plumbing for MVP Uniform
    // 5-> A. Uniforms will bind  to bind group in shader so create bind  group layout  for  our MVP  uniform
    // a. Bind group layout entry GPUBindGroupLayoutEntry
    const bindGroupLayout_uniform = createBindGroupLayoutUniform(
        0,
        GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, // this is very very very imp cause now we are sending uniform data to both vertex and fragment shader so we need to specify both vertex and fragment shader stage here
        "uniform"
    );

    // 5->B. Create pipeline Layout  to specify  one  or many above  bind  groups layout.
    //a. first we will create pipeline layout descriptor. GPUPipelineLayoutDescriptor then
    const pipelineLayoutDescriptor = {
        bindGroupLayouts: [bindGroupLayout_uniform]
    };

    // b. Create pipeline layout. GPUPipelineLayout
    const pipelineLayout = device.createPipelineLayout(pipelineLayoutDescriptor);

    if (pipelineLayout == null) {
        console.log("Failed to create pipeline layout for MVP uniform \n");
        throw Error("Failed to create pipeline layout for MVP uniform \n");
    } else {
        console.log("Pipeline layout for MVP uniform is created successfully \n");
    }


    // 5->C. Now  create uniform buffer for our uniform buffer
    // a. Create uniform buffer descriptor. GPUBufferDescriptor
    const myUniformBufferSize = Float32Array.BYTES_PER_ELEMENT * 16 + // model matrix
        Float32Array.BYTES_PER_ELEMENT * 16 + // from 64th byte offset to 128th byte offset is view matrix
        Float32Array.BYTES_PER_ELEMENT * 16 + // from 128th byte offset to 192th byte offset is projection matrix
        Float32Array.BYTES_PER_ELEMENT * 4 +  // from 192th byte offset to 207th byte offset is light ambient
        Float32Array.BYTES_PER_ELEMENT * 4 +  // from 208th byte offset to 223th byte offset is light diffuse
        Float32Array.BYTES_PER_ELEMENT * 4 +  // from 224th byte offset to 239th byte offset is light specular
        Float32Array.BYTES_PER_ELEMENT * 4 +  // from 240th byte offset to 255th byte offset is light position
        Float32Array.BYTES_PER_ELEMENT * 4 +  // from 256th byte offset to 271th byte offset is material ambient
        Float32Array.BYTES_PER_ELEMENT * 4 +  // from 272th byte offset to 287th byte offset is material diffuse
        Float32Array.BYTES_PER_ELEMENT * 4 +  // from 288th byte offset to 303th byte offset is material specular
        Float32Array.BYTES_PER_ELEMENT * 4 + // from 304th byte offset to 319th byte offset is material shininess
        Uint32Array.BYTES_PER_ELEMENT * 4; // from 320th byte offset to 335th byte offset is lKeyPressed



    buffer_uniform = createUniformBuffer(myUniformBufferSize, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);


    // d. Create bind group for uniform buffer. GPUBindGroup
    // ## Will set this binding group in display.

    bindingGroup_uniform = createBindGroupForUniform(buffer_uniform, 0, myUniformBufferSize, 0, bindGroupLayout_uniform);


    // 6   we will create PSO (Pipeline State Object) now we are going to create what is needed for PSO (Pipeline State Object) 
    // A Create render pipeline descriptor. GPURenderPipelineDescriptor
    // a. we need to vertex buffer layout descriptor. GPUVertexBufferLayoutDescriptor for that we need to create vertex attribute  
    // i. Create vertex attribute for position . GPUVertexAttribute 
    const positionVertexAttribute = {
        offset: 0, // this is the offset in the buffer where the attribute data starts
        shaderLocation: 0, // this matches with @location(0) in vertex shader
        format: "float32x3" // this is the format of the attribute data
    };

    // ii. Create gpu vertex buffer laout using above gpu vertex attribute. GPUVertexBufferLayout
    const positionVertexBufferLayout = {
        attributes: [positionVertexAttribute], // this is the array of attributes for the vertex buffer
        arrayStride: Float32Array.BYTES_PER_ELEMENT * 3, // this is the size of one vertex in bytes (4 floats * 4 bytes per float)       
        stepMode: "vertex" // this means that the vertex buffer will be jumped to the next vertex for each vertex shader invocation //jump vertex by vertex not instance by instance
    };

    //=================== Vertex Buffer Layout is created successfully ===================
    const normalVertexAttribute = {
        shaderLocation: 1,
        offset: 0,
        format: "float32x3"
    };

    const normalVeretexBufferLayout = {
        attributes: [normalVertexAttribute],
        arrayStride: Float32Array.BYTES_PER_ELEMENT * 3,
        stemMode: "vertex"
    };

    //b. Create vertex shader state . GPUVertexState
    const vertexShadeState = {
        module: shaderModule_vertexShader, // this is the vertex shader module that we created earlier
        entryPoint: "main", // this is the entry point of the vertex shader
        buffers: [positionVertexBufferLayout, normalVeretexBufferLayout] // this is the array of vertex buffer layouts that we created earlier
    };

    //=================== Vertex Shader State is created successfully ===================

    //c. Create fragment shader state. GPUFragmentState
    // we need to create GPU fragment state  but before that create GPU color target state  
    // i. Create color target state. GPUColorTargetState
    const colorTargetState = {
        format: canvasFormat, // this is the format of the color attachment that we will render to
    };

    // ii. create  actual fragment shaderstate using above target color  state.
    // Create fragment shader state. GPUFragmentState
    const fragentShaderState = {
        module: shaderModule_fragmentShader, // this is the fragment shader module that we created earlier
        entryPoint: "main", // this is the entry point of the fragment shader
        targets: [colorTargetState] // this is the array of color target states that we created earlier
    };

    //the only difference between vertex shader state and fragment shader state is that vertex shader state has buffers and fragment shader state has targets

    // the final step required for PSO is to create the primitive state. GPUPrimitiveState
    //d. Create primitive state. GPUPrimitiveState
    const primitiveState = {
        frontFace: "ccw", // this means that the front face of the triangle is counter-clockwise
        cullMode: "none",// this means that no faces will be culled
        topology: "triangle-list", // this means that the vertices will be interpreted as a list of triangles
    };

    // Added in 06-Depth
    //depth stencil state
    const depthStencilState = {
        depthWriteEnabled: true, // this means that the depth buffer will be written to
        depthCompare: "less-equal", // this means that a fragment will pass the depth test if its depth is less than or equal to the current depth buffer value.
        format: "depth24plus-stencil8", // without stencil we can use "depth24plus" 
        //we are using "depth24plus-stencil8" because we may go for shadow mapping, deffeered rendering, decal rendering.
    };


    //e.  Finally  create the render pipeline  descriptor PSO (GPURenderPipelineDescriptor)
    const pipelineDescriptor = {
        layout: pipelineLayout, // this is the pipeline layout that we created earlier
        vertex: vertexShadeState, // this is the vertex shader state that we created earlier
        fragment: fragentShaderState, // this is the fragment shader state that we created earlier
        primitive: primitiveState, // this is the primitive state that we created earlier
        depthStencil: depthStencilState, // this is the depth stencil state that we created earlier
    };

    // B. Create render pipeline. GPURenderPipeline
    render_pipeline = device.createRenderPipeline(pipelineDescriptor);
    if (render_pipeline == null) {
        console.log("Failed to create render pipeline \n");
        throw Error("Failed to create render pipeline \n");
    } else {
        console.log("Render pipeline is created successfully \n");
    }

    // 7. Initialize the perspective projection matrix to identity matrix.
    perspectiveProjectionMatrix = mat4.create();

    // define the  clear  color for the canvas
    clear_color = {
        r: 0.0,
        g: 0.0,
        b: 0.0,
        a: 1.0
    };

}


function resize() {
    console.log("resize() is called \n");
    //code
    if (bFullScreen == true) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    else {
        canvas.width = canvas_original_width;
        canvas.height = canvas_original_height;
    }

    // Added in 06-Depth
    // Create depth texture for depth testing

    if (device != null) {
        if (depthTexture != null) {
            depthTexture.destroy();
            depthTexture = null;
        }
        // to create depth texture we need to create GPUTextureDescriptor
        const depthTextureDescriptor = {
            size: [canvas.width, canvas.height, 1],
            dimension: "2d",
            format: "depth24plus-stencil8",
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
        };

        // now create depth texture using above depth texture descriptor. GPUTexture
        depthTexture = device.createTexture(depthTextureDescriptor);
        if (depthTexture == null) {
            console.log("Failed to create depth Texture \n");
            throw Error("Failed to create  depth Texture  \n");
        }
    }



    // /Initialze projection matrix
    mat4.perspective(perspectiveProjectionMatrix,
        45.0 * Math.PI / 180.0,
        parseFloat(canvas.width) / parseFloat(canvas.height),
        0.1,
        100.0);

}

function display() {
    //code
    //device maybe lost and initialization may not be done yet 

    if (device == null) {
        return;
    }

    /**
     * GPUCommandEncoder is used to record commands for the GPU to execute. 
     It allows you to create command buffers that can be submitted to the GPU 
     for rendering or computation tasks. The command encoder is responsible for 
    encoding various GPU commands, such as drawing, copying data, and setting pipeline states.
    */
    const commandEncoder = device.createCommandEncoder();

    if (commandEncoder == null) {
        console.log("Failed to create command encoder \n");
        throw Error("Failed to create command encoder \n");
    }

    const renderPassColorAttachment = {
        view: context.getCurrentTexture().createView(),
        clearValue: clear_color,
        loadOp: 'clear',
        storeOp: 'store'
    };

    // Now  create render pass depth attachement 
    const renderPassDepthAttachment = {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
        stencilClearValue: 0,
        stencilLoadOp: "clear",
        stencilStoreOp: "store",
    }

    const renderPassDescriptor = {
        colorAttachments: [renderPassColorAttachment],
        depthStencilAttachment: renderPassDepthAttachment,
    };

    // Added in 02-Perspective_Triangle
    //1. Transformations for model, view and projection matrices
    //  A.  Create and initialize required matrices here  we need  model  view  matrix  and model view projection matrix
    const modelMatrix = mat4.create();
    const viewMatrix = mat4.create();
    // const modelViewProjectionMatrix = mat4.create();
    //B.  Do  needed  transformations here  we do  only translation.
    // first param is target matrix, second param is source matrix, third param is translation vector
    mat4.translate(modelMatrix, modelMatrix, [0.0, 0.0, -6.0]); //translate the modelview matrix by -4 units in z direction

    //C.  Now multiply modelview matrix with perspective projection matrix to get modelviewprojection matrix
    // mat4.multiply(modelViewProjectionMatrix, perspectiveProjectionMatrix, modelMatrix);

    //toggle lighting
    if (isLightingEnabled == true) {
        lKeyPressed[0] = 1;
    } else {
        lKeyPressed[0] = 0;
    }

    // Now write all the uniform data to the uniform buffer we created in above 5-> C step.
    // 12 writebuffer() call to fill  the one unified buffer  targeting individual byte offsets as we saw while initializing
    // myUniformBufferSize in above 5-> C step.
    // 1 : matrices
    queue.writeBuffer(buffer_uniform,
        0, // 0th byte offset to 63th byte offset
        modelMatrix,
        0,
        modelMatrix.length
    );

    queue.writeBuffer(buffer_uniform,
        Float32Array.BYTES_PER_ELEMENT * 16, // 64th byte offset to 127th byte offset
        viewMatrix,
        0,
        viewMatrix.length
    );

    queue.writeBuffer(buffer_uniform,
        Float32Array.BYTES_PER_ELEMENT * 16 + Float32Array.BYTES_PER_ELEMENT * 16, // 128th byte offset to 191th byte offset
        perspectiveProjectionMatrix,
        0,
        perspectiveProjectionMatrix.length
    );

    // 2 : light properties
    queue.writeBuffer(buffer_uniform,
        Float32Array.BYTES_PER_ELEMENT * 16 * 3, // 192th byte offset to 207th byte offset
        lightAmbient,
        0,
        lightAmbient.length
    );

    queue.writeBuffer(buffer_uniform,
        Float32Array.BYTES_PER_ELEMENT * 16 * 3 + Float32Array.BYTES_PER_ELEMENT * 4 * 1, //208th byte offset to 223th byte offset
        lightDiffuse,
        0,
        lightDiffuse.length
    );

    queue.writeBuffer(buffer_uniform,
        Float32Array.BYTES_PER_ELEMENT * 16 * 3 + Float32Array.BYTES_PER_ELEMENT * 4 * 2,
        lightSpecular,
        0,
        lightSpecular.length
    );

    queue.writeBuffer(buffer_uniform,
        Float32Array.BYTES_PER_ELEMENT * 16 * 3 + Float32Array.BYTES_PER_ELEMENT * 4 * 3,
        lightPosition,
        0,
        lightPosition.length
    );

    //3: materials 
    queue.writeBuffer(buffer_uniform,
        Float32Array.BYTES_PER_ELEMENT * 16 * 3 + Float32Array.BYTES_PER_ELEMENT * 4 * 4,
        materialAmbient,
        0,
        materialAmbient.length
    );

    queue.writeBuffer(buffer_uniform,
        Float32Array.BYTES_PER_ELEMENT * 16 * 3 + Float32Array.BYTES_PER_ELEMENT * 4 * 5,
        materialDiffuse,
        0,
        materialDiffuse.length
    );

    queue.writeBuffer(buffer_uniform,
        Float32Array.BYTES_PER_ELEMENT * 16 * 3 + Float32Array.BYTES_PER_ELEMENT * 4 * 6,///from 288th byte offset to 303th byte offset is material specular
        materialSpecular,
        0,
        materialSpecular.length
    );

    queue.writeBuffer(buffer_uniform,
        Float32Array.BYTES_PER_ELEMENT * 16 * 3 + Float32Array.BYTES_PER_ELEMENT * 4 * 7,// from 304th byte offset to 319th byte offset is material shininess
        materialShininess,
        0,
        materialShininess.length
    );


    // 4: Light Toggle 
    queue.writeBuffer(buffer_uniform,
        Float32Array.BYTES_PER_ELEMENT * 16 * 3 + Float32Array.BYTES_PER_ELEMENT * 4 * 8,
        lKeyPressed,
        0,
        lKeyPressed.length
    );





    // Now write this MVP to the uniform buffer we  created in above 5-> C step.
    //D.  Now write this modelviewprojection matrix to uniform buffer
    // four parameters are : 
    // 1. destination buffer,
    // 2. destination buffer  offset where data writing will start,
    // 3. this is source data that we want to write in buffer, 
    // 4. in modelViewProjection matrix from to read so we are saying from 0th  offset,
    // 5. how much data we want to write from source 
    // queue.writeBuffer(buffer_uniform, 0, modelViewProjectionMatrix, 0, modelViewProjectionMatrix.length);


    //2. Start the render pass
    const renderPassEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    // 3. Set folllowing properties of  renderpass  encoder

    //a. set the render pipeline
    renderPassEncoder.setPipeline(render_pipeline);

    //b set the viewport
    // viewport is the area of the canvas where we will render our scene.
    // four parameters are : 
    // 1.x  => this is the x coordinate of the top left corner of the viewport
    // 2.y  => this is the y coordinate of the top left corner of the viewport
    // 3.width => this is the width of the viewport
    // 4.height => this is the height of the viewport
    // 5.minDepth => this is the minimum depth value of the viewport
    // 6.maxDepth => this is the maximum depth value of the viewport
    renderPassEncoder.setViewport(0, 0, canvas.width, canvas.height, 0, 1);

    //c. set the scissor rect
    // scissor rect is the area of the viewport where we will render our scene.
    // four parameters are : 
    // 1.x  => this is the x coordinate of the top left corner of the scissor rect
    // 2.y  => this is the y coordinate of the top left corner of the scissor rect
    // 3.width => this is the width of the scissor rect
    // 4.height => this is the height of the scissor rect
    renderPassEncoder.setScissorRect(0, 0, canvas.width, canvas.height);

    //d set vertex buffer
    // vertex buffer is the buffer that contains the vertex data for our scene.
    // 1. first parameter is the slot number of the vertex buffer,
    // 2. second parameter is the vertex buffer that we want to set
    renderPassEncoder.setVertexBuffer(0, buffer_position);
    renderPassEncoder.setIndexBuffer(buffer_element, "uint16");

    //for normal 
    renderPassEncoder.setVertexBuffer(1, buffer_normal);


    //e. set bind group
    // bind group is the group of resources that we want to bind to the pipeline.
    // 1. first parameter is the slot number of the bind group,
    // 2. second parameter is the bind group that we want to set
    renderPassEncoder.setBindGroup(0, bindingGroup_uniform);

    //4. Draw the triangle
    // 1. first parameter is the number of vertices to draw
    // renderPassEncoder.draw(3);
    renderPassEncoder.drawIndexed(numMeshIndices);

    //end the render pass
    renderPassEncoder.end();

    // Finish encoding commands and submit them to the GPU queue
    const commandBuffer = commandEncoder.finish();
    queue.submit([commandBuffer]);


    animationFrameId = requestAnimationFrame(display);

}

function update() {

}


function keyDown(event) {
    //code
    switch (event.key) {
        case "Escape":
            uninitialize();
            // windoe.close() may not work in all browsers due to security reasons.
            window.close();
            break;
        case "f":
        case "F":
            toggleFullScreen();
            break;

        case "L":
        case "l":
            if (isLightingEnabled == false) {
                isLightingEnabled = true;
            } else {
                isLightingEnabled = false;
            }
            break;

        default:
            break;
    }
}

function mousedown() {
    //code
    //do something here for mouse click
}


//create bind group layout for uniform buffer
// user defined function  
function createBindGroupLayoutUniform(_bindingIndex, _shaderStageVisibility, _uniformType) {

    //code

    const bindGroupLayoutEntry = {
        binding: _bindingIndex,
        visibility: _shaderStageVisibility,
        buffer: {
            type: _uniformType
        }
    }

    const bindGroupLayoutDescriptor = {
        entries: [bindGroupLayoutEntry]
    }

    const bindGroupLayout = device.createBindGroupLayout(bindGroupLayoutDescriptor);

    if (bindGroupLayout == null) {
        console.log("Failed to create bind group layout for uniform buffer \n");
        throw Error("Failed to create bind group layout for uniform buffer \n");
    } else {
        console.log("Bind group layout for uniform buffer is created successfully \n");
    }

    return bindGroupLayout;
}


// user defined function  
function createUniformBuffer(_uniformBufferSize, _uniformBufferUsage) {
    const bufferDescriptor = {
        size: _uniformBufferSize,
        usage: _uniformBufferUsage,
    };

    const buffer = device.createBuffer(bufferDescriptor);

    if (buffer == null) {
        console.log("Failed to create uniform buffer \n");
        throw Error("Failed to create uniform buffer \n");
    } else {
        console.log("Uniform buffer is created successfully \n");
    }

    return buffer;
}

// user defined function  
function createBindGroupForUniform(
    _uniformBuffer,
    _uniformBufferOffset,
    _uniformBufferSize,
    _bindingIndex,
    _bindGroupLayout) {

    const bufferBinding = {
        buffer: _uniformBuffer,
        offset: _uniformBufferOffset,
        size: _uniformBufferSize
    };

    const bindGroupEntry = {
        binding: _bindingIndex,
        resource: bufferBinding,
    };

    const bindGroupDescriptor = {
        entries: [bindGroupEntry],
        layout: _bindGroupLayout,

    };

    const bindGroup = device.createBindGroup(bindGroupDescriptor);

    if (bindGroup == null) {
        console.log("Failed to create bind group for uniform buffer \n");
        throw Error("Failed to create bind group for uniform buffer \n");
    } else {
        console.log("Bind group for uniform buffer is created successfully \n");
    }

    return bindGroup;

}


//create vertex buufer UDF
function createVertexBuffer(_vertexData) {

    //code
    const bufferDescriptor = {
        size: _vertexData.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    };

    const buffer = device.createBuffer(bufferDescriptor);

    if (buffer == null) {
        return null;
    }

    queue.writeBuffer(buffer, 0, _vertexData, 0, _vertexData.length);
    return buffer;
}

//create index buffer UDF
function createIndexBuffer(_indexData) {

    //code 
    const bufferDescriptor = {
        size: _indexData.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    };

    const buffer = device.createBuffer(bufferDescriptor);

    if (buffer == null) {
        return null;
    }

    queue.writeBuffer(buffer, 0, _indexData, 0, _indexData.length);
    return buffer;
}

function onDeviceLost(info) {
    console.warn("WebGPU  device lost  reason:", info.reason, "Message:", info.message);
    device = null;
    queue = null;
    render_pipeline = null;
    buffer_uniform = null;
    bindingGroup_uniform = null;
    perspectiveProjectionMatrix = null;
    depthTexture = null;
    sphere = null;
    numMeshIndices = 0;
    buffer_position = null;
    buffer_normal = null;
    buffer_texcoord = null;
    buffer_element = null;
}

function uninitialize() {
    //code
    // use animation frame id to cancel the animation frame
    if (animationFrameId != null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    //destroy depth texure
    if (depthTexture != null) {
        depthTexture.destroy();
        depthTexture = null;
    }

    if (context != null) {
        context.unconfigure();
        context = null;
    }

    if (device != null) {
        device.destroy();
        device = null;
        queue = null;

        render_pipeline = null;
        buffer_uniform = null;
        bindingGroup_uniform = null;

        buffer_position = null;
        buffer_normal = null;
        buffer_texcoord = null;
        buffer_element = null;
    }

    sphere = null;

    perspectiveProjectionMatrix = null;

    console.log("Uninitialize is successfull.");
}
