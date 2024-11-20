import {
  ArcRotateCamera,
  Engine,
  HemisphericLight,
  Layer,
  Mesh,
  Scene,
  SceneLoader,
  Vector3,
  Tools,
} from "@babylonjs/core";
import { AdvancedDynamicTexture } from "@babylonjs/gui";
import "@babylonjs/loaders";
import "@babylonjs/loaders/glTF";
import React, { useEffect, useRef, useState } from "react";
import { PollyM } from "./polly";
let pollyM;
let audio;
let visemes = [];
let targets = [];
let jawTargets = [];
let eyeLashTargets = [];
let visemeMap = new Map();
let jawVisemeMap = new Map();
let eyeLashVisemeMap = new Map();
let startTime = 0;
let previousIndex = -10;
let previousJawIndex = -10;
let previousEyeLashIndex = -10;
const Avatar = ({ msg }) => {
  const canvasRef1 = useRef(null);

  const videoref = useRef(null);
  let [scene, setScene] = useState(null);
  let [meshes, setMeshes] = useState(null);
  let animationsGLB = [];
  let cpAnimationsGLB = [];
  var player;
  let advancedTexture = null;

  const importAnimations = (scene) => {
    return SceneLoader.ImportMeshAsync(null, "", "anim.glb", scene).then(
      (result) => {
        result.meshes.forEach((element) => {
          if (element) element.dispose();
        });
        for (let i = 0; i < result.animationGroups.length; i++) {
          cpAnimationsGLB.push(result.animationGroups[i]);
        }
        importModel(scene);
      }
    );
  };

  const importModel = async (scene) => {
    pollyM = new PollyM();
    const result = await SceneLoader.ImportMeshAsync(
      "",
      "",
      "user1.glb",
      scene
    );

    meshes = result.meshes;

    setMeshes(meshes);
    player = result.meshes[0];
    player.name = "Character";

    var modelTransformNodes = player.getChildTransformNodes();

    cpAnimationsGLB.forEach((animation) => {
      const modelAnimationGroup = animation.clone(
        animation.name,
        (oldTarget) => {
          return modelTransformNodes.find(
            (node) => node.name === oldTarget.name
          );
        }
      );
      animation.dispose();
    });
    cpAnimationsGLB = [];
    let i = 0;
    for (let i = 0; scene.animationGroups.length; i++) {
      if (scene.animationGroups[i].name == "base") {
        scene.animationGroups[i].play(true);
        break;
      }
    }

    for (let i = 0; i < result.meshes.length; i++) {
      if (result.meshes[i].name == "AvatarHead") {
        let morphTargetManager = result.meshes[i].morphTargetManager;
        if (morphTargetManager) {
          targets = morphTargetManager?._targets;
          if (targets && targets.length > 0) {
            break;
          }
        }
      }
    }

    for (let i = 0; i < result.meshes.length; i++) {
      if (result.meshes[i].name == "AvatarTeethLower") {
        let morphTargetManager = result.meshes[i].morphTargetManager;
        if (morphTargetManager) {
          jawTargets = morphTargetManager?._targets;
          if (jawTargets && jawTargets.length > 0) {
            break;
          }
        }
      }
    }

    for (let i = 0; i < targets.length; i++) {
      visemeMap.set(targets[i].name, i);
    }

    for (let i = 0; i < jawTargets.length; i++) {
      jawVisemeMap.set(jawTargets[i].name, i);
    }
    eyeBlinking();
  };

  const eyeBlinking = () => {
    targets[visemeMap.get("eyeBlinkLeft")].influence = 0;
    targets[visemeMap.get("eyeBlinkRight")].influence = 0;
    setInterval(async () => {
      targets[visemeMap.get("eyeBlinkLeft")].influence = 1;
      targets[visemeMap.get("eyeBlinkRight")].influence = 1;
      setTimeout(() => {
        targets[visemeMap.get("eyeBlinkLeft")].influence = 0;
        targets[visemeMap.get("eyeBlinkRight")].influence = 0;
      }, 500);
    }, 2500);
  };

  const createScene = (engine, canvas) => {
    scene = new Scene(engine);
    setScene(scene);
    advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");
    var layer = new Layer("BG", "bg.png", scene, true);
    const camera0 = new ArcRotateCamera(
      "mainCamera",
      1.5708,
      1.22173,
      2,
      new Vector3(0, 2.2, 0),
      scene
    );

    importAnimations(scene);
    camera0.attachControl(canvas, true);
    camera0.lowerRadiusLimit = 2;
    camera0.upperRadiusLimit = 2;
    camera0.wheelDeltaPercentage = 0;
    //camera0.setTarget(meshes[0].position);
    var light = new HemisphericLight("light1", new Vector3(-0.1, 0, 0), scene);
    light.intensity = 4;

    engine.runRenderLoop(() => {
      scene.render();
    });

    return scene;
  };

  let applyVisemeFunction = () => {
    console.log("targets ", targets);
    const elapsed = Tools.Now - startTime;
    let influence = 1;
    if (visemes.length > 0) {
      let index = 0;
      for (let cnt = 0; cnt < visemes.length; cnt++) {
        let temp = visemes.at(cnt);
        if (elapsed >= temp.tick) {
          continue;
        } else {
          if (cnt > 0) {
            index = cnt - 1;
            break;
          } else {
            index = 0;
            break;
          }
        }
      }
      if (index > 0) {
        visemes.splice(0, index - 1);
      }
      let obj = visemes.at(0);
      if (elapsed >= obj.tick) {
        if (previousIndex != -10) {
          try {
            targets[previousIndex].influence = 0;
            jawTargets[previousJawIndex].influence = 0;
            //eyeLashTargets[previousEyeLashIndex].influence = 0;
          } catch (e) {
            console.log("error ", e);
          }
        }
        let i = visemeMap.get(obj.action);
        let j = jawVisemeMap.get(obj.action);
        let k = eyeLashVisemeMap.get(obj.action);
        previousIndex = i;
        previousJawIndex = j;
        previousEyeLashIndex = k;
        try {
          targets[i].influence = influence;
          jawTargets[j].influence = influence;
          // eyeLashTargets[k].influence = influence;
        } catch (e) {
          console.log("error ", e);
        }
        visemes.splice(0, 1);
      }
    } else if (visemes.length == 0) {
      try {
        targets[previousIndex].influence = 0;
        jawTargets[previousJawIndex].influence = 0;
      } catch (e) {
        console.log("error ", e);
      }
      try {
        scene.unregisterAfterRender(applyVisemeFunction);
      } catch (e) {
        console.log("error: ", e);
      }
    }
  };

  // this useEffect call's on every time when stream is on/off. create or clear roompose.
  useEffect(() => {
    console.log("My Message", msg);
    if (msg) {
      if (pollyM) {
        pollyM.getVisemesFromText((m, type, data) => {
          visemes = data[0];
          pollyM.getAudioFromText((m, type, url) => {
            audio = new Audio(url);
            audio.play();
            startTime = Tools.Now;
            scene.registerAfterRender(applyVisemeFunction);
          }, "<speak>" + msg + "</speak>");
        }, "<speak>" + msg + "</speak>");
      }
    }
  }, [msg]);

  // this useEffects call only once, it will handle babylon create scene logic
  useEffect(() => {
    const canvas = canvasRef1.current;
    const engine = new Engine(canvas, true);
    const scene = createScene(engine, canvas);
    engine.runRenderLoop(() => {
      scene.render();
    });

    window.addEventListener("resize", () => {
      engine.resize();
    });
  }, []);

  return (
    <div>
      <canvas
        className="render-canvas"
        ref={canvasRef1}
        style={{
          display: "flex",
          position: "relative",
          height: 300,
          width: 300,
        }}
      ></canvas>

      <div></div>
    </div>
  );
};
export default Avatar;
