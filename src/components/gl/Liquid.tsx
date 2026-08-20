import { useEffect, useRef } from "react";
import { DISPLAY_FRAG, DYE_FRAG, QUAD_VERT } from "./liquidShaders";
import { prefersReducedMotion } from "../../lib/motion";
import { isLowQuality } from "../../lib/quality";
import { onPointerImpulse, pointerState } from "../../lib/pointer";
import { isMobile } from "../../lib/platform";
import {
  LIQUID_RANGE,
  attachLiquid,
  liquidField,
  pulseLiquid,
  subscribeLiquid,
} from "../../lib/liquid";

/**
 * Liquid — the surface the whole site sits on.
 *
 * It renders the field from src/lib/liquid.ts; it does not simulate one. That
 * is the single most important decision in this file. A GPU fluid would look
 * the same and cost less to draw, but the DOM cannot read a texture, so the
 * windows could never move with the liquid. One simulation on the CPU, coarse
 * enough to be free, uploaded once per frame as a 34×19 texture, keeps the
 * canvas and the layout in the same world.
 *
 * Everything else here is budget discipline:
 *  - The dye buffers are 256×144 on desktop, 160×90 on a phone. The result is
 *    blurred by refraction anyway, so resolution buys nothing.
 *  - Device pixel ratio is capped at 1.5 (1.25 on a phone). A retina display
 *    would otherwise quadruple the fragment count for an effect that is, by
 *    design, out of focus.
 *  - One full-screen triangle, not a quad: three vertices, no index buffer.
 *  - Reduced motion, no WebGL, or a lost context all fall back to the CSS
 *    gradient already on .gl. The page never depends on this file.
 */

type Props = {
  /** False while the preloader owns the screen. */
  active: boolean;
};

const readVar = (name: string, fallback: string) => {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
};

/** #rgb / #rrggbb → normalised rgb, so the palette stays in tokens.css. */
const hexToRgb = (hex: string): [number, number, number] => {
  const clean = hex.replace("#", "").trim();
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const int = parseInt(full.slice(0, 6) || "000000", 16);
  return [
    ((int >> 16) & 255) / 255,
    ((int >> 8) & 255) / 255,
    (int & 255) / 255,
  ];
};

const compile = (
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

const program = (
  gl: WebGLRenderingContext,
  vertSource: string,
  fragSource: string,
): WebGLProgram | null => {
  const vert = compile(gl, gl.VERTEX_SHADER, vertSource);
  const frag = compile(gl, gl.FRAGMENT_SHADER, fragSource);
  if (!vert || !frag) return null;

  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  gl.deleteShader(vert);
  gl.deleteShader(frag);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
};

export default function Liquid({ active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const introRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (prefersReducedMotion()) return;
    /* جهاز ضعيف لا يدفع ثمن محاكاة سوائل خلف النصّ. التدرّج الساكن على .gl
       هو نفسه البديل المعتمد للحالتين. */
    if (isLowQuality()) return;

    const gl = (canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
      preserveDrawingBuffer: false,
    }) ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;

    if (!gl) return;

    let lost = false;
    const onLost = (event: Event) => {
      event.preventDefault();
      lost = true;
    };
    canvas.addEventListener("webglcontextlost", onLost);

    const phone = isMobile();
    const SIM_W = phone ? 160 : 256;
    const SIM_H = phone ? 90 : 144;
    const DPR_CAP = phone ? 1.25 : 1.5;

    const dyeProgram = program(gl, QUAD_VERT, DYE_FRAG);
    const displayProgram = program(gl, QUAD_VERT, DISPLAY_FRAG);
    if (!dyeProgram || !displayProgram) {
      canvas.removeEventListener("webglcontextlost", onLost);
      return;
    }

    /* One triangle that covers the clip volume. */
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );

    const bindQuad = (prog: WebGLProgram) => {
      const loc = gl.getAttribLocation(prog, "aPosition");
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    };

    const makeTexture = (width: number, height: number) => {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        width,
        height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
      );
      return texture;
    };

    const makeTarget = (width: number, height: number) => {
      const texture = makeTexture(width, height);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture,
        0,
      );
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { texture, fbo };
    };

    let dyeA = makeTarget(SIM_W, SIM_H);
    let dyeB = makeTarget(SIM_W, SIM_H);

    /* The CPU field, uploaded as RGBA8. Two channels carry velocity; the
       other two are padding, because RGBA uploads avoid the row alignment
       rules that make RG or LUMINANCE fiddly across drivers. */
    const field = liquidField();
    const velTexture = makeTexture(field.cols, field.rows);
    const velPixels = new Uint8Array(field.cols * field.rows * 4);

    const encode = (value: number) => {
      const normalised = value / LIQUID_RANGE;
      const clamped = normalised < -1 ? -1 : normalised > 1 ? 1 : normalised;
      return Math.round((clamped * 0.5 + 0.5) * 255);
    };

    const uploadField = () => {
      for (let row = 0; row < field.rows; row++) {
        /* GL texture rows run bottom-up; the field runs top-down. Flipping
           here, once, is cheaper than flipping in the shader forever. */
        const source = field.rows - 1 - row;
        for (let col = 0; col < field.cols; col++) {
          const from = source * field.cols + col;
          const to = (row * field.cols + col) * 4;
          velPixels[to] = encode(field.vx[from]);
          velPixels[to + 1] = encode(-field.vy[from]);
          velPixels[to + 2] = 0;
          velPixels[to + 3] = 255;
        }
      }
      gl.bindTexture(gl.TEXTURE_2D, velTexture);
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        field.cols,
        field.rows,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        velPixels,
      );
    };

    const dyeUniforms = {
      dye: gl.getUniformLocation(dyeProgram, "uDye"),
      vel: gl.getUniformLocation(dyeProgram, "uVel"),
      dt: gl.getUniformLocation(dyeProgram, "uDt"),
      dissipation: gl.getUniformLocation(dyeProgram, "uDissipation"),
      pointer: gl.getUniformLocation(dyeProgram, "uPointer"),
      pointerForce: gl.getUniformLocation(dyeProgram, "uPointerForce"),
      aspect: gl.getUniformLocation(dyeProgram, "uAspect"),
    };

    const displayUniforms = {
      dye: gl.getUniformLocation(displayProgram, "uDye"),
      vel: gl.getUniformLocation(displayProgram, "uVel"),
      time: gl.getUniformLocation(displayProgram, "uTime"),
      aspect: gl.getUniformLocation(displayProgram, "uAspect"),
      intro: gl.getUniformLocation(displayProgram, "uIntro"),
      refraction: gl.getUniformLocation(displayProgram, "uRefraction"),
      paper: gl.getUniformLocation(displayProgram, "uPaper"),
      paperDeep: gl.getUniformLocation(displayProgram, "uPaperDeep"),
      accent: gl.getUniformLocation(displayProgram, "uAccent"),
    };

    /* Palette straight from the design tokens: the canvas can never drift
       away from the CSS. */
    const paper = hexToRgb(readVar("--surface", "#efebe1"));
    const paperDeep = hexToRgb(readVar("--surface-3", "#ded6c5"));
    const accent = hexToRgb(readVar("--accent", "#e2431b"));
    const refraction = phone ? 0.04 : 0.055;

    let aspect = 1;

    /* بعد آخر لمسة يتلاشى الحبر بمعامل 0.982 في الإطار. بعد 300 إطار يصير
       0.982^300 ≈ 0.004 من شدّته: أقلّ من درجة لون واحدة، أي لا شيء يُرى.
       من تلك اللحظة نتوقّف عن الرسم واللوحة تحتفظ بآخر إطار رسمته. */
    const QUIET_FRAMES = 300;
    let sinceActivity = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      const width = Math.max(1, Math.round(window.innerWidth * dpr));
      const height = Math.max(1, Math.round(window.innerHeight * dpr));
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      aspect = width / height;
      sinceActivity = 0;
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });

    /* A click or a tap is a pour, not a stroke. */
    const detachImpulse = onPointerImpulse((nx, ny) => {
      pulseLiquid(nx * window.innerWidth, ny * window.innerHeight, 1.15);
      sinceActivity = 0;
    });

    const release = attachLiquid();
    let pointerForce = 0;

    const stop = subscribeLiquid(
      (tick) => {
        if (lost) return;

        /* Intro: hold the paper flat under the preloader, then pour. */
        const targetIntro = active ? 1 : 0;
        introRef.current += (targetIntro - introRef.current) * (1 - Math.pow(0.004, tick.dt));

        /* Ink only while the pointer is actually doing something. */
        const wanted = pointerState.present
          ? Math.min(1, pointerState.speed * 0.08 + (pointerState.down ? 0.5 : 0))
          : 0;
        pointerForce += (wanted - pointerForce) * 0.2;

        /* نشاط = مؤشّر حاضر يتحرّك، أو ضغط، أو حبر ما زال يُدفع، أو مقدّمة لم
           تستقرّ بعد. أيّ واحد منها يُصفّر العدّاد. */
        const busy =
          (pointerState.present && pointerState.speed > 0.05) ||
          pointerState.down ||
          pointerForce > 0.002 ||
          Math.abs(targetIntro - introRef.current) > 0.002;

        sinceActivity = busy ? 0 : sinceActivity + 1;

        /* خمس ثوانٍ من السكون التامّ وحقل سرعة ميّت: لا رفع نسيج، ولا تمريرة
           صبغة، ولا تمريرة عرض. الحلقة تبقى حيّة فيستأنف الرسم فوراً عند أوّل
           حركة، بلا إطار ضائع. */
        if (sinceActivity > QUIET_FRAMES && tick.energy < 0.0009) return;

        uploadField();

        /* --- dye pass ------------------------------------------------- */
        gl.useProgram(dyeProgram);
        bindQuad(dyeProgram);
        gl.bindFramebuffer(gl.FRAMEBUFFER, dyeB.fbo);
        gl.viewport(0, 0, SIM_W, SIM_H);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, dyeA.texture);
        gl.uniform1i(dyeUniforms.dye, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, velTexture);
        gl.uniform1i(dyeUniforms.vel, 1);

        gl.uniform1f(dyeUniforms.dt, tick.dt);
        gl.uniform1f(dyeUniforms.dissipation, 0.982);
        gl.uniform2f(
          dyeUniforms.pointer,
          pointerState.nx,
          1 - pointerState.ny,
        );
        gl.uniform1f(
          dyeUniforms.pointerForce,
          pointerForce * introRef.current * 0.5,
        );
        gl.uniform1f(dyeUniforms.aspect, aspect);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        const swap = dyeA;
        dyeA = dyeB;
        dyeB = swap;

        /* --- display pass --------------------------------------------- */
        gl.useProgram(displayProgram);
        bindQuad(displayProgram);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, dyeA.texture);
        gl.uniform1i(displayUniforms.dye, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, velTexture);
        gl.uniform1i(displayUniforms.vel, 1);

        gl.uniform1f(displayUniforms.time, tick.time);
        gl.uniform1f(displayUniforms.aspect, aspect);
        gl.uniform1f(displayUniforms.intro, introRef.current);
        gl.uniform1f(displayUniforms.refraction, refraction);
        gl.uniform3f(displayUniforms.paper, paper[0], paper[1], paper[2]);
        gl.uniform3f(
          displayUniforms.paperDeep,
          paperDeep[0],
          paperDeep[1],
          paperDeep[2],
        );
        gl.uniform3f(displayUniforms.accent, accent[0], accent[1], accent[2]);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      /* The dye needs frames even when the field is still, otherwise a trail
         freezes mid-fade instead of dissolving. */
      { continuous: true },
    );

    return () => {
      stop();
      release();
      detachImpulse();
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("webglcontextlost", onLost);

      gl.deleteTexture(dyeA.texture);
      gl.deleteTexture(dyeB.texture);
      gl.deleteFramebuffer(dyeA.fbo);
      gl.deleteFramebuffer(dyeB.fbo);
      gl.deleteTexture(velTexture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(dyeProgram);
      gl.deleteProgram(displayProgram);
    };
  }, [active]);

  return <canvas ref={canvasRef} className="gl" aria-hidden="true" />;
}
