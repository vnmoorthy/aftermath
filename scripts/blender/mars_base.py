# Ares Base, Jezero crater: a procedural Mars colony scene rendered in Blender (Cycles) as
# (1) a 360° equirectangular panorama for the phone's look-around view and (2) a first-person still.
# Usage: Blender -b -P scripts/blender/mars_base.py -- <out_dir>
import bpy, math, random, sys, time
from mathutils import Vector, noise
t0 = time.time()
out = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "/tmp"
random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def smooth(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a))); return t * t * (3 - 2 * t)
def height(x, y):
    r = math.hypot(x, y)
    base = 5.5 * noise.fractal(Vector((x / 90, y / 90, 0.3)), 1.0, 2.0, 5) + 1.1 * noise.fractal(Vector((x / 14, y / 14, 1.7)), 1.0, 2.0, 4)
    flat = 0.12 + 0.88 * smooth(30, 80, r)          # a levelled yard around the base
    rim = 110 * smooth(380, 1100, r) * (0.75 + 0.25 * noise.noise(Vector((x / 300, y / 300, 5.0))))  # crater rim on the horizon
    return base * flat + rim

def mat(name, color, rough=0.6, metal=0.0, emit=None, estr=0.0, glass=False):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if emit:
        for k in ("Emission Color", "Emission"):
            if k in b.inputs: b.inputs[k].default_value = (*emit, 1); break
        b.inputs["Emission Strength"].default_value = estr
    if glass:
        for k in ("Transmission Weight", "Transmission"):
            if k in b.inputs: b.inputs[k].default_value = 1.0; break
        b.inputs["Roughness"].default_value = 0.04; b.inputs["IOR"].default_value = 1.45
    return m

def ground_mat():
    m = bpy.data.materials.new("regolith"); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; L = nt.links
    b = N.get("Principled BSDF"); o = N.get("Material Output")
    tc = N.new("ShaderNodeTexCoord"); nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 0.35; nz.inputs["Detail"].default_value = 10
    L.new(tc.outputs["Object"], nz.inputs["Vector"])
    ramp = N.new("ShaderNodeValToRGB"); cr = ramp.color_ramp
    cr.elements[0].position = 0.35; cr.elements[0].color = (0.30, 0.10, 0.045, 1)
    cr.elements[1].position = 0.7; cr.elements[1].color = (0.62, 0.27, 0.12, 1)
    e = cr.elements.new(0.52); e.color = (0.46, 0.17, 0.07, 1)
    L.new(nz.outputs["Fac"], ramp.inputs["Fac"]); L.new(ramp.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.95
    nz2 = N.new("ShaderNodeTexNoise"); nz2.inputs["Scale"].default_value = 9; nz2.inputs["Detail"].default_value = 12
    L.new(tc.outputs["Object"], nz2.inputs["Vector"])
    bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.35
    L.new(nz2.outputs["Fac"], bump.inputs["Height"]); L.new(bump.outputs["Normal"], b.inputs["Normal"])
    # distance haze: dusty air swallows the horizon
    cam = N.new("ShaderNodeCameraData"); mr = N.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = 40; mr.inputs["From Max"].default_value = 1400; mr.inputs["To Max"].default_value = 0.82
    L.new(cam.outputs["View Distance"], mr.inputs["Value"])
    em = N.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (0.84, 0.58, 0.42, 1); em.inputs["Strength"].default_value = 1.1
    mix = N.new("ShaderNodeMixShader")
    L.new(mr.outputs["Result"], mix.inputs["Fac"]); L.new(b.outputs["BSDF"], mix.inputs[1]); L.new(em.outputs["Emission"], mix.inputs[2])
    L.new(mix.outputs["Shader"], o.inputs["Surface"])
    return m
REG = ground_mat()
WHITE = mat("hab", (0.86, 0.85, 0.82), 0.42, 0.05)
GREY = mat("grey", (0.23, 0.23, 0.24), 0.55, 0.3)
STEEL = mat("steel", (0.78, 0.79, 0.81), 0.22, 1.0)
PANEL = mat("solar", (0.02, 0.04, 0.12), 0.18, 0.6)
WINDOW = mat("window", (1, 0.85, 0.6), 0.3, 0, emit=(1.0, 0.78, 0.5), estr=9)
GLASS = mat("glass", (0.9, 0.95, 1.0), glass=True)
PLANT = mat("plant", (0.08, 0.5, 0.12), 0.6, 0, emit=(0.25, 1.0, 0.35), estr=2.5)
PAD = mat("pad", (0.36, 0.33, 0.31), 0.9)

# terrain: dense near the camera, sparse far away
n = 260; verts = []; faces = []
for j in range(n):
    for i in range(n):
        u = i / (n - 1) * 2 - 1; v = j / (n - 1) * 2 - 1
        x = math.copysign(abs(u) ** 2.3, u) * 2600; y = math.copysign(abs(v) ** 2.3, v) * 2600
        verts.append((x, y, height(x, y)))
for j in range(n - 1):
    for i in range(n - 1):
        a = j * n + i; faces.append((a, a + 1, a + n + 1, a + n))
me = bpy.data.meshes.new("terrain"); me.from_pydata(verts, [], faces); me.update()
try: me.shade_smooth()
except Exception: [setattr(p, "use_smooth", True) for p in me.polygons]
terrain = bpy.data.objects.new("terrain", me); scene.collection.objects.link(terrain); me.materials.append(REG)
print("terrain", round(time.time() - t0, 1))

def put(obj, m, x, y, z=0.0):
    obj.location = (x, y, height(x, y) + z)
    if m: obj.data.materials.append(m)
    return obj
def add(kind, m, x, y, z=0.0, **kw):
    getattr(bpy.ops.mesh, f"primitive_{kind}_add")(**kw); return put(bpy.context.active_object, m, x, y, z)

# rocks (one shared lumpy mesh, many instances)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1)
rock = bpy.context.active_object
for vtx in rock.data.vertices:
    p = vtx.co; vtx.co = p * (1 + 0.32 * noise.noise(p * 1.7 + Vector((3, 1, 2))))
rock.data.materials.append(REG); rock.location = (0, 0, -50)
for k in range(260):
    ang = random.random() * 6.283; r = 3 + (random.random() ** 1.7) * 260
    x, y = math.cos(ang) * r, math.sin(ang) * r
    if -28 < x < 26 and 2 < y < 34: continue
    o = rock.copy(); scene.collection.objects.link(o)
    s = 0.12 + random.random() ** 2.5 * (1.6 if r > 20 else 0.7)
    o.scale = (s * (0.8 + random.random() * 0.5), s * (0.8 + random.random() * 0.5), s * (0.45 + random.random() * 0.4))
    o.rotation_euler = (random.random(), random.random(), random.random() * 6.3)
    o.location = (x, y, height(x, y) + s * 0.15)

# Ares Base
add("uv_sphere", WHITE, 0, 22, -0.5, radius=6.5, segments=48, ring_count=24)
add("cylinder", WHITE, 0, 22, 0.8, radius=6.6, depth=2.2, vertices=64)
add("torus", WINDOW, 0, 22, 1.9, major_radius=6.62, minor_radius=0.12)
add("uv_sphere", WHITE, -15, 18, -0.4, radius=4.6, segments=40, ring_count=20)
add("cylinder", WHITE, -7.5, 20, 1.2, radius=1.3, depth=9, vertices=32).rotation_euler = (0, math.pi / 2, math.radians(-15))
add("cube", WHITE, 0, 14.6, 1.4, size=3)                         # airlock facing the camera
add("cube", WINDOW, 0, 13.05, 1.6, size=1).scale = (0.6, 0.02, 1.0)
add("uv_sphere", GLASS, 16, 13, -0.6, radius=5.2, segments=48, ring_count=24)
for k in range(26):
    a = random.random() * 6.283; rr = random.random() * 3.8
    add("uv_sphere", PLANT, 16 + math.cos(a) * rr, 13 + math.sin(a) * rr, 0.4 + random.random() * 0.8, radius=0.35 + random.random() * 0.35, segments=12, ring_count=8)
bpy.ops.object.light_add(type="POINT", location=(16, 13, height(16, 13) + 2.5)); bpy.context.active_object.data.energy = 900; bpy.context.active_object.data.color = (0.6, 1.0, 0.65)
bpy.ops.object.light_add(type="POINT", location=(0, 12.5, height(0, 12.5) + 3.4)); bpy.context.active_object.data.energy = 300; bpy.context.active_object.data.color = (1.0, 0.8, 0.55)
for row in range(4):                                             # solar farm
    for col in range(7):
        x, y = -26 + col * 2.6, -14 - row * 3.2
        add("cube", GREY, x, y, 0.6, size=0.15).scale = (1, 1, 8)
        p = add("cube", PANEL, x, y, 1.3, size=1); p.scale = (1.2, 0.8, 0.03); p.rotation_euler = (math.radians(-32), 0, 0)
rv_x, rv_y = -8, 3                                               # six-wheeled rover
b = add("cube", WHITE, rv_x, rv_y, 1.1, size=1); b.scale = (1.6, 1.0, 0.45)
for dx in (-1.2, 0, 1.2):
    for dy in (-1.15, 1.15):
        wl = add("cylinder", GREY, rv_x + dx, rv_y + dy, 0.45, radius=0.45, depth=0.35, vertices=24); wl.rotation_euler = (math.pi / 2, 0, 0)
add("cylinder", GREY, rv_x + 1.0, rv_y, 2.0, radius=0.06, depth=1.6, vertices=12)
add("cube", WHITE, rv_x + 1.0, rv_y, 2.9, size=0.4)
add("cylinder", GREY, 11, -10, 2.6, radius=0.12, depth=5.2, vertices=12)   # comms dish to Earth
d = add("uv_sphere", WHITE, 11, -10, 5.4, radius=1.8, segments=32, ring_count=16); d.scale = (1, 1, 0.25); d.rotation_euler = (math.radians(35), 0, math.radians(40))
add("cylinder", PAD, 70, -130, 0.1, radius=18, depth=0.4, vertices=64)     # landing pad + return vehicle
add("cylinder", STEEL, 70, -130, 25, radius=4.5, depth=50, vertices=48)
add("cone", STEEL, 70, -130, 55, radius1=4.5, depth=10, vertices=48)
for k in range(3):
    f = add("cube", STEEL, 70 + math.cos(k * 2.094) * 5, -130 + math.sin(k * 2.094) * 5, 3, size=1); f.scale = (1.6, 0.15, 3); f.rotation_euler = (0, 0, k * 2.094)
for k in range(6):                                               # supply crates by the airlock
    add("cube", GREY if k % 2 else WHITE, -3.5 + k * 0.9 + random.random() * 0.2, 11.5 + random.random(), 0.35, size=0.7)
print("objects", round(time.time() - t0, 1))

# Mars sky: butterscotch by day, blue glow around the low sun
sun_el, sun_az = math.radians(15), math.radians(205)
sun_dir = Vector((math.cos(sun_el) * math.sin(sun_az), math.cos(sun_el) * math.cos(sun_az), math.sin(sun_el)))
world = bpy.data.worlds.new("mars"); scene.world = world; world.use_nodes = True
N = world.node_tree.nodes; L = world.node_tree.links; bg = N.get("Background")
tc = N.new("ShaderNodeTexCoord"); sep = N.new("ShaderNodeSeparateXYZ"); L.new(tc.outputs["Generated"], sep.inputs["Vector"])
mr = N.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = -0.02; mr.inputs["From Max"].default_value = 0.7; L.new(sep.outputs["Z"], mr.inputs["Value"])
ramp = N.new("ShaderNodeValToRGB"); cr = ramp.color_ramp
cr.elements[0].color = (0.86, 0.6, 0.45, 1); cr.elements[1].color = (0.42, 0.25, 0.16, 1)
e = cr.elements.new(0.3); e.color = (0.72, 0.45, 0.3, 1)
L.new(mr.outputs["Result"], ramp.inputs["Fac"])
dot = N.new("ShaderNodeVectorMath"); dot.operation = "DOT_PRODUCT"; dot.inputs[1].default_value = sun_dir
L.new(tc.outputs["Generated"], dot.inputs[0])
glow = N.new("ShaderNodeMapRange"); glow.inputs["From Min"].default_value = 0.93; glow.inputs["From Max"].default_value = 1.0; L.new(dot.outputs["Value"], glow.inputs["Value"])
pw = N.new("ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = 3.0; L.new(glow.outputs["Result"], pw.inputs[0])
mixc = N.new("ShaderNodeMix"); mixc.data_type = "RGBA"
L.new(pw.outputs["Value"], mixc.inputs["Factor"]); L.new(ramp.outputs["Color"], mixc.inputs[6]); mixc.inputs[7].default_value = (0.62, 0.78, 1.0, 1)
disk = N.new("ShaderNodeMapRange"); disk.inputs["From Min"].default_value = 0.99985; disk.inputs["From Max"].default_value = 0.99995; disk.inputs["To Max"].default_value = 40
L.new(dot.outputs["Value"], disk.inputs["Value"])
add_ = N.new("ShaderNodeMath"); add_.operation = "ADD"; add_.inputs[1].default_value = 0.9; L.new(disk.outputs["Result"], add_.inputs[0])
L.new(mixc.outputs[2], bg.inputs["Color"]); L.new(add_.outputs["Value"], bg.inputs["Strength"])
bpy.ops.object.light_add(type="SUN"); sun = bpy.context.active_object
sun.data.energy = 3.2; sun.data.color = (1.0, 0.9, 0.76); sun.data.angle = math.radians(0.6)
sun.rotation_euler = sun_dir.to_track_quat("Z", "Y").to_euler()

# render setup: Cycles on the GPU
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"  # Metal kernels need a long first-time compile; the CPU is fast enough for this scene
scene.cycles.samples = 20; scene.cycles.use_denoising = True
try: scene.cycles.denoiser = "OPENIMAGEDENOISE"
except Exception: pass
try: scene.view_settings.look = "AgX - Medium High Contrast"
except Exception: pass
eye = height(0, 0) + 1.7
bpy.ops.object.camera_add(location=(0, 0, eye)); cam = bpy.context.active_object; scene.camera = cam
cam.data.type = "PANO"
try: cam.data.panorama_type = "EQUIRECTANGULAR"
except Exception: cam.data.cycles.panorama_type = "EQUIRECTANGULAR"
cam.rotation_euler = (math.pi / 2, 0, 0)  # level, facing +Y (the hab) at the centre of the panorama
scene.render.resolution_x, scene.render.resolution_y = 2048, 1024
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = f"{out}/mars-pano.png"; bpy.ops.render.render(write_still=True)
print("pano", round(time.time() - t0, 1))
cam.data.type = "PERSP"; cam.data.lens = 18; cam.location = (2.5, -4, eye); cam.rotation_euler = (math.radians(88), 0, math.radians(14))
scene.render.resolution_x, scene.render.resolution_y = 720, 1280
scene.render.filepath = f"{out}/mars-fp.png"; bpy.ops.render.render(write_still=True)
print("done", round(time.time() - t0, 1))
