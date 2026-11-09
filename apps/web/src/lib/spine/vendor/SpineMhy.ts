/* eslint-disable */
// @ts-nocheck
// Vendored from the trading-site repo (src/shared/utils/spine). Keep logic identical.

import { Spine } from "pixi-spine";
import { AutoBone, AutoBoneSpeed, AutoSlot } from './SpineMhyExt';

export class SpineMhy extends Spine {
    constructor(skeletonData) {
        super(skeletonData);
        this.autoBone = Object.values(skeletonData.extra || {}).map(value => {
            return new AutoBone(value, this);
        });
        this.autoBoneSpeed = new AutoBoneSpeed(skeletonData.extraConfig || {});
        this.autoSlot = Object.values(skeletonData.extraSlot || {}).map(value => {
            return new AutoSlot(value, this);
        });
    }
    enableAutoBone = 1;
    disableSlotColor = 1;
    autoBoneTime = 0;
    resetAutoBone = 0;

    alignAutoBone(time) {
        const propertyNames = ["rotateTime", "scaleXTime", "scaleYTime", "moveXTime", "moveYTime", "rotateFreq", "scaleXFreq", "scaleYFreq", "moveXFreq", "moveYFreq"];
        this.autoBone.forEach(bone => {
            Object.values(bone.animation).forEach(anim => {
                propertyNames.forEach(propertyName => {
                    if (anim[propertyName]) {
                        if (!anim["init" + propertyName]) anim["init" + propertyName] = anim[propertyName];
                        let multiple = Math.round(time / anim["init" + propertyName]) || 1;
                        anim[propertyName] = time / multiple;
                    }
                });
                if (anim["windFreq"]) {
                    if (!anim["initwindFreq"]) anim["initwindFreq"] = anim["windFreq"];
                    let multiple = Math.round(time * anim["initwindFreq"]) || 1;
                    anim["windFreq"] = multiple / time;
                }
                if (anim["rotateSpeed"]) {
                    if (!anim["initrotateSpeed"]) anim["initrotateSpeed"] = anim["rotateSpeed"];
                    let multiple = Math.round(time * anim["initrotateSpeed"]) || 1;
                    anim["rotateSpeed"] = multiple / time;
                }
            });
        });
    }

    unalignAutoBone() {
        const propertyNames = ["rotateTime", "scaleXTime", "scaleYTime", "moveXTime", "moveYTime", "rotateFreq", "scaleXFreq", "scaleYFreq", "moveXFreq", "moveYFreq", "windFreq", "rotateSpeed"];
        this.autoBone.forEach(bone => {
            Object.values(bone.animation).forEach(anim => {
                propertyNames.forEach(propertyName => {
                    if (anim["init" + propertyName]) {
                        anim[propertyName] = anim["init" + propertyName];
                    }
                });
            });
        });
    }

    update(dt) {
        if (this.resetAutoBone === 1) {
            this.autoBoneTime = 0;
            this.autoBone.forEach(bone => bone.reset());
            this.autoSlot.forEach(slot => slot.render(this.autoBoneTime));
            this.resetAutoBone = 0;
        }
        else if (this.enableAutoBone == 1 && dt) {
            let i = 1;
            let a = null;
            this.autoBoneTime = this.autoBoneTime + dt * this.autoBoneSpeed.timeScale * this.state.timeScale;
            if (this.state.tracks[0]) {
                i = this.state.tracks[0].mixDuration ? Math.min(1, this.state.tracks[0].mixTime / this.state.tracks[0].mixDuration) : 1;
                if (i < 1 && this.state.tracks[0].mixingFrom && this.state.tracks[0].mixingFrom.animation) {
                    a = this.state.tracks[0].mixingFrom.animation.name;
                }
            }
            const s = Math.min(2, dt * this.autoBoneSpeed.timeScale * this.state.timeScale / .0167);
            this.autoBone.forEach(bone => bone.render(s, this.autoBoneTime, i, a));
            this.autoSlot.forEach(slot => slot.render(this.autoBoneTime));
        }
        // 米哈游模型使用slot颜色做特殊用途，需要强制重置为白色以正确显示
        if (this.disableSlotColor == 1) {
            const delayLimit = this.delayLimit;
            if (dt > delayLimit) dt = delayLimit;
            this.state.update(dt);
            this.state.apply(this.skeleton);
            for (let i = 0, n = this.skeleton.slots.length; i < n; i++) {
                this.skeleton.slots[i].color.r = 1;
                this.skeleton.slots[i].color.g = 1;
                this.skeleton.slots[i].color.b = 1;
            }
            let update = this.state.update;
            let apply = this.state.apply;
            this.state.update = () => { };
            this.state.apply = () => { };
            super.update(dt);
            this.state.update = update;
            this.state.apply = apply;
        }
        else {
            super.update(dt);
        }
    }
}
