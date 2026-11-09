/* eslint-disable */
// @ts-nocheck
// Vendored from the trading-site repo (src/shared/utils/spine). Keep logic identical.

/**
 * pixi-spine 补丁：在任何 spine 资源加载前导入此文件
 * 通过猴子补丁替换解析器和渲染逻辑，使 pixi-spine 兼容米哈游自定义 Spine 格式
 */
import { Spine, TextureAtlasPage } from "pixi-spine";
import * as spine37 from "@pixi-spine/runtime-3.7"
import * as spine38 from "@pixi-spine/runtime-3.8"
import * as spine41 from "@pixi-spine/runtime-4.1"
import { detectSpineVersion, SPINE_VERSION, SpineParser } from "@pixi-spine/loader-uni"
import { PhysicsConstraint, PhysicsConstraintData } from "./PhysicsConstraint"
import { UniBinaryParser, UniJsonParser } from "./SkeletonParser42"

export const runtime = {
    version: 0,
    data: {
        [SPINE_VERSION.VER37]: spine37,
        [SPINE_VERSION.VER38]: spine38,
        [SPINE_VERSION.VER40]: spine41,
        [SPINE_VERSION.VER41]: spine41,
    }
}

// 修复atlas/纹理尺寸不匹配问题
const setFilters = TextureAtlasPage.prototype.setFilters
TextureAtlasPage.prototype.setFilters = function () {
    if (this.baseTexture.width !== this.width || this.baseTexture.height !== this.height) {
        this.baseTexture.setSize(this.width, this.height)
    }
    setFilters.apply(this, arguments)
}

// 替换 Spine 的骨骼创建逻辑，支持运行时版本切换
Spine.prototype.createSkeleton = function (spineData) {
    const ver = detectSpineVersion(spineData.version);

    const spine = runtime.data[runtime.version] || runtime.data[ver]
    if (!spine) {
        throw `无法检测 Spine 模型版本 ${spineData.version}`
    }

    const rawSpine = runtime.data[ver]

    this.skeleton = new spine.Skeleton(spineData);
    this.skeleton.updateWorldTransform();
    this.stateData = new rawSpine.AnimationStateData(spineData);
    this.state = new rawSpine.AnimationState(this.stateData);
}

// 替换解析器为自定义版本，支持 4.2 格式和米哈游扩展字段
SpineParser.prototype.createBinaryParser = function() {
    return new UniBinaryParser();
}

SpineParser.prototype.createJsonParser = function() {
    return new UniJsonParser();
}

// 注入物理模拟时间追踪
const update = Spine.prototype.update;
Spine.prototype.update = function (dt) {
    if (this.skeleton.enablePhysics !== 0) {
        this.skeleton.time = (this.skeleton.time || 0) + dt * this.state.timeScale;
    }
    update.call(this, dt);
    this.skeleton.resetPhysics = 0;
}

// 拦截 transform 约束排序，将 physics-xxx 命名的约束替换为自定义物理约束
const sortTransformConstraint = spine41.Skeleton.prototype.sortTransformConstraint;
spine41.Skeleton.prototype.sortTransformConstraint = function (constraint) {
    if (!constraint.target.isActive()) return;
    if (!this.hasOwnProperty('physicsConstraints')) {
        this.physicsConstraints = [];
    }
    if (constraint.bones && constraint.bones[0] == constraint.target && this.data.hasOwnProperty('physics') && this.data.physics.find(physicsConstraint => `physics-${physicsConstraint.name}` == constraint.data.name)) {
        this.sortBone(constraint.target);
        let physicsConstraint = this.physicsConstraints.find(physicsConstraint => `physics-${physicsConstraint.data.name}` == constraint.data.name);
        if (!physicsConstraint) {
            physicsConstraint = new PhysicsConstraint(new PhysicsConstraintData(this.data.physics.find(physicsConstraint => `physics-${physicsConstraint.name}` == constraint.data.name)), this);
            this.physicsConstraints.push(physicsConstraint);
        }
        this._updateCache.push(physicsConstraint);
        this.sortReset(constraint.target.children);
        constraint.target.sorted = true;
    } else {
        sortTransformConstraint.call(this, constraint);
    }
}
