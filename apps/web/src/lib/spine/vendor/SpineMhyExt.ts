/* eslint-disable */
// @ts-nocheck
// Vendored from the trading-site repo (src/shared/utils/spine). Keep logic identical.

// npm install gsap@3.12.4
import * as gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";

gsap.gsap.registerPlugin(CustomEase);

class AutoBone {
    public animation: Record<string, any>;
    public rootMovement!: any;
    public rootBoneName!: string;
    public endBoneName!: string;
    public targetBoneName!: string;
    public targetEndBoneName!: string;
    public targetWeight!: number;
    public history: BoneAnimationHistory;
    public spineObj!: any;
    public rootBone!: any;
    public targetBone!: any;

    public constructor(extra: any, spineObj: any) {
        this.animation = {};
        if (extra && extra.animation) {
            Object.keys(extra.animation).forEach(key => {
                this.animation[key] = AutoBone.createAnimation(extra.animation[key]);
            });
        }
        this.rootMovement = 0;
        this.rootBoneName = extra.rootBoneName ?? "";
        if (extra) {
            this.endBoneName = Array.isArray(extra.endBoneName) ? extra.endBoneName : (extra.endBoneName ? [extra.endBoneName] : []);
        }
        this.targetBoneName = extra.targetBoneName ?? "";
        this.targetEndBoneName = extra.targetEndBoneName ?? "";
        this.targetWeight = extra.targetWeight ?? 1;
        this.history = new BoneAnimationHistory();
        this.bind(spineObj);
    }

    public pixiCompat() {
        if (this.rootBone) {
            for (let i = 0; i < this.rootBone.skeleton.bones.length; i++) {
                let bone = this.rootBone.skeleton.bones[i];
                if (bone.matrix) {
                    bone.a = bone.matrix.a;
                    bone.b = bone.matrix.c;
                    bone.c = -bone.matrix.b;
                    bone.d = -bone.matrix.d;
                    bone.worldXData = bone.worldX;
                    bone.worldYData = -bone.worldY;
                } else {
                    bone.worldXData = bone.worldX;
                    bone.worldYData = bone.worldY;
                }
            }
        }
    }

    public static updateWorldTransform(bone: any) {
        bone.updateWorldTransform();
        if (bone.matrix) {
            bone.a = bone.matrix.a;
            bone.b = bone.matrix.c;
            bone.c = -bone.matrix.b;
            bone.d = -bone.matrix.d;
            bone.worldXData = bone.worldX;
            bone.worldYData = -bone.worldY;
        } else {
            bone.worldXData = bone.worldX;
            bone.worldYData = bone.worldY;
        }
    }

    public static worldToLocal(bone: any, world: any) {
        let invDet = 1 / (bone.a * bone.d - bone.b * bone.c);
        let x = world.x - bone.worldXData, y = world.y - bone.worldYData;
        world.x = x * bone.d * invDet - y * bone.b * invDet;
        world.y = y * bone.a * invDet - x * bone.c * invDet;
        return world;
    }

    public static worldToLocalRotation(bone: any, worldRotation: number) {
        let sin = Math.sin(worldRotation * 3.1415927 / 180), cos = Math.cos(worldRotation * 3.1415927 / 180);
        return Math.atan2(bone.a * sin - bone.c * cos, bone.d * cos - bone.b * sin) * 180 / 3.1415927 + bone.rotation - bone.shearX;
    }

    public bind(spineObj: any) {
        this.spineObj = spineObj;
        this.rootBone = spineObj.skeleton.findBone(this.rootBoneName);
        this.pixiCompat();
        if (this.targetBoneName !== "") {
            this.targetBone = spineObj.skeleton.findBone(this.targetBoneName);
        }
        this.init(this.rootBone);
    }

    public init(rootBone: any, ...args: any[]) {
        rootBone.initX = rootBone.x;
        rootBone.initY = rootBone.y;
        rootBone.initWorldX = rootBone.worldX;
        rootBone.initWorldY = rootBone.worldY;
        rootBone.initScaleX = rootBone.scaleX;
        rootBone.initScaleY = rootBone.scaleY;
        rootBone.initRotation = rootBone.rotation;
        rootBone.autoMovePrevWorldX = rootBone.worldXData;
        rootBone.autoMovePrevWorldY = rootBone.worldYData;
        rootBone.autoMoveSpeedX = 0;
        rootBone.autoMoveSpeedY = 0;
        rootBone.autoMoveFriction = 0;
        rootBone.followRotation = 0;
        rootBone.elasticSpeedX = 0;
        rootBone.elasticSpeedY = 0;

        const n = (args.length > 0) && (typeof args[0] !== 'undefined') ? args[0] : 0;
        rootBone.children.forEach((child: any) => this.init(child, n + 1));
        if (rootBone.children.length === 0) {
            rootBone.tailAutoMovePrevWorldX = rootBone.y * rootBone.b + rootBone.worldXData;
            rootBone.tailAutoMovePrevWorldY = rootBone.y * rootBone.d + rootBone.worldYData;
        }
    }

    public reset() {
        this.rootMovement = 0;
        this.resetBone();
    }

    public resetBone(bone?: any) {
        if (typeof bone === 'undefined') {
            bone = this.rootBone;
        }
        if (bone.matrix) {
            bone.matrix.tx = bone.initWorldX;
            bone.matrix.ty = bone.initWorldY;
            bone.scaleX = bone.initScaleX;
            bone.scaleY = bone.initScaleY;
            bone.rotation = bone.initRotation;
        }
        else {
            bone.worldX = bone.initWorldX;
            bone.worldY = bone.initWorldY;
            bone.scaleX = bone.initScaleX;
            bone.scaleY = bone.initScaleY;
            bone.rotation = bone.initRotation;
        }
        if (!this.endBoneName.includes(bone.name)) {
            bone.children.forEach((child: any) => this.resetBone(child));
        }
    }

    public render(t: any, e: any, n: any, r: any) {
        this.pixiCompat();
        let i = null;
        let s = 1;
        if (!this.history.current) {
            this.history.check(this.currentTrackName, this.currentAnimation);
        }
        if (r && this.currentTrackName !== r) {
            i = (this.animation[r] || this.defaultAnimation);
            this.history.check(this.currentTrackName, this.currentAnimation);
        }
        if (i && 1 !== n) {
            s = n;
            this.renderAutoBone(i, this.history.previous, t, e, 1);
        }
        this.renderAutoBone(this.currentAnimation, this.history.current, t, e, s)
    }

    public renderAutoBone(t: any, e: any, n: any, r: any, i: any) {
        var a = t.mode;
        if (1 === a)
            this.updateSineMode(t, r, this.rootBone, this.targetBone, 0, i);
        else if (2 === a)
            e && this.updatePhysicMode(t, e, this.rootBone, r, n, i);
        else if (3 === a) {
            var o = t.moveXFreq
                , s = t.moveXAmp
                , u = t.moveXOctaves
                , l = t.moveXDelay
                , c = t.moveXCenter
                , h = t.moveYSameAsX
                , f = t.moveXSeed
                , d = 0 === s ? 0 : this.updateWiggleMode(o, s, u, r, l) + c;
            if (this.rootBone.x = this.mixValue(this.rootBone.x, this.rootBone.initX + d, i),
                h)
                d = 0 === s ? 0 : this.updateWiggleMode(o, s, u, r, l + f) + c,
                    this.rootBone.y = this.mixValue(this.rootBone.y, this.rootBone.initY + d, i);
            else {
                var p = t.moveYFreq
                    , v = t.moveYAmp
                    , m = t.moveYOctaves
                    , g = t.moveYDelay
                    , y = t.moveYCenter;
                d = 0 === v ? 0 : this.updateWiggleMode(p, v, m, r, g) + y,
                    this.rootBone.y = this.mixValue(this.rootBone.y, this.rootBone.initY + d, i)
            }
            var _ = t.scaleXFreq
                , x = t.scaleXAmp
                , b = t.scaleXOctaves
                , w = t.scaleXDelay
                , M = t.scaleXCenter
                , S = t.scaleYSameAsX;
            if (d = 0 === x ? 0 : this.updateWiggleMode(_, x, b, r, w) + M,
                this.rootBone.scaleX = this.mixValue(this.rootBone.scaleX, this.rootBone.initScaleX + d, i),
                S)
                this.rootBone.scaleY = this.mixValue(this.rootBone.scaleY, this.rootBone.initScaleY + d, i);
            else {
                var k = t.scaleYFreq
                    , T = t.scaleYAmp
                    , A = t.scaleYOctaves
                    , E = t.scaleYDelay
                    , C = t.scaleYCenter;
                d = 0 === T ? 0 : this.updateWiggleMode(k, T, A, r, E) + C,
                    this.rootBone.scaleY = this.mixValue(this.rootBone.scaleY, this.rootBone.initScaleY + d, i)
            }
            var P = t.rotateSpeed
                , L = t.rotateFreq
                , O = t.rotateAmp
                , R = t.rotateOctaves
                , I = t.rotateDelay
                , D = t.rotateCenter
                , F = t.rotateFollowEnable
                , N = t.rotateFollowLimit
                , B = t.rotateFollowSpeed
                , U = t.rotateFollowFlip
                , z = t.rotateFollowXMax
                , V = t.rotateFollowYMax;
            if (d = this.rootBone.initRotation + r * P * 360 + D,
                d += 0 === O ? 0 : this.updateWiggleMode(L, O, R, r, I),
                F) {
                var j = this.rootBone.worldXData - this.rootBone.autoMovePrevWorldX
                    , G = this.rootBone.worldYData - this.rootBone.autoMovePrevWorldY
                    , W: any = void 0
                    , X = (W = 1 === U ? -N * Math.max(-1, Math.min(1, j / z)) - N * Math.max(-1, Math.min(1, G / V)) : (Math.atan2(G, j) * (180 / Math.PI) + 360) % 360) - this.rootBone.followRotation;
                X >= 180 ? W -= 360 : X <= -180 && (W += 360),
                    this.rootBone.followRotation += Math.min(N, Math.max(-N, W - this.rootBone.followRotation)) * B,
                    this.rootBone.followRotation = (this.rootBone.followRotation + 360) % 360,
                    2 === U && Math.abs(this.rootBone.followRotation - 180) < 90 && (this.rootBone.scaleY *= -1),
                    d += this.rootBone.followRotation
            }
            this.rootBone.autoMovePrevWorldX = this.rootBone.worldXData,
                this.rootBone.autoMovePrevWorldY = this.rootBone.worldYData,
                this.rootBone.rotation = this.mixValue(this.rootBone.rotation, d, i)
        } else if (4 === a) {
            let worldScale = { x: this.rootBone.scaleX, y: this.rootBone.scaleY };
            let parentBone = this.rootBone.parent;
            while (parentBone) {
                worldScale.x = worldScale.x * parentBone.scaleX;
                worldScale.y = worldScale.y * parentBone.scaleY;
                parentBone = parentBone.parent;
            }
            var Y = worldScale
                , H = Y.x
                , q = Y.y
                , Z = t.hasWindForce
                , J = t.gravityX
                , K = t.gravityY;
            if (t.forceX = -J,
                t.forceY = -K,
                Z) {
                var $ = .5 + .5 * this.updateWiggleMode(1 / t.windFreq, 1, t.windOctaves, r, t.windDelay, .8);
                t.forceX += t.windX * $,
                    t.forceY += t.windY * $
            }
            this.updateSpringMagic(t, this.rootBone, this.targetBone, r, n, 0, i, H * q < 0 ? -1 : 1)
        } else
            5 === a ? this.updateElasic(t, this.rootBone, n, i) : 6 === a && this.updateKeyFrameMode(t, this.rootBone, r, i)
    }

    public getHistoryRotate(t: any, e: any) {
        for (var n = e.length - 1; n > -1; n--) {
            var r = e[n];
            if (r.time > t) {
                for (var i = n - 1; i > -1; i--) {
                    var a = e[i];
                    if (t >= a.time)
                        return a.delta + (r.delta - a.delta) * (t - a.time) / (r.time - a.time)
                }
                return 0
            }
        }
        return 0
    }

    public mixValue(t: any, e: any, n: any) {
        return t + (e - t) * n
    }

    public updateSineMode(t: any, e: any, ...args: any[]) {
        var n = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : this.rootBone
            , r = arguments.length > 3 && void 0 !== arguments[3] ? arguments[3] : this.targetBone
            , i = this
            , a = arguments.length > 4 && void 0 !== arguments[4] ? arguments[4] : 0
            , o = arguments[5];
        if (!this.endBoneName.includes(n.data.name)) {
            var s = r && r.data.name !== this.targetEndBoneName
                , u = s ? this.mixValue(n.initRotation, r.rotation, this.targetWeight) : n.initRotation;
            n.rotation = this.mixValue(n.rotation, u + Math.sin((t.rotateOffset - Math.pow(t.childOffset * a, 1 + t.spring) + e) * Math.PI * 2 / t.rotateTime) * t.rotateRange * Math.pow(1 + a * t.affectByLevel, 1 + t.springLevel) + t.rotateCenter, o);
            var l = 0;
            if (0 !== t.scaleYRange) {
                var c = s ? this.mixValue(n.initScaleY, r.scaleY, this.targetWeight) : n.initScaleY;
                if (l = Math.sin((t.scaleYOffset - Math.pow(t.scaleYChildOffset * a, 1 + t.scaleYSpring) + e) * Math.PI * 2 / t.scaleYTime) * t.scaleYRange * Math.pow(1 + a * t.scaleYAffectByLevel, 1 + t.springLevel) + t.scaleYCenter,
                    n.scaleY = this.mixValue(n.scaleY, c + l, o),
                    t.sinScaleXSameAsY) {
                    var h = s ? this.mixValue(n.initScaleX, r.scaleX, this.targetWeight) : n.initScaleX;
                    n.scaleX = this.mixValue(n.scaleX, h + l, o)
                }
            }
            if (!t.sinScaleXSameAsY && 0 !== t.scaleXRange) {
                var f = s ? this.mixValue(n.initScaleX, r.scaleX, this.targetWeight) : n.initScaleX;
                l = Math.sin((t.scaleXOffset - Math.pow(t.scaleXChildOffset * a, 1 + t.scaleXSpring) + e) * Math.PI * 2 / t.scaleXTime) * t.scaleXRange * Math.pow(1 + a * t.scaleXAffectByLevel, 1 + t.springLevel) + t.scaleXCenter,
                    n.scaleX = this.mixValue(n.scaleX, f + l, o)
            }
            if (0 !== t.moveXRange) {
                var d = s ? this.mixValue(n.initX, r.x, this.targetWeight) : n.initX
                    , p = Math.sin((t.moveXOffset - Math.pow(t.moveXChildOffset * a, 1 + t.moveXSpring) + e) * Math.PI * 2 / t.moveXTime) * t.moveXRange * Math.pow(1 + a * t.moveXAffectByLevel, 1 + t.springLevel) + t.moveXCenter;
                n.x = this.mixValue(n.x, p + d, o)
            }
            if (0 !== t.moveYRange) {
                var v = s ? this.mixValue(n.initY, r.y, this.targetWeight) : n.initY
                    , m = Math.sin((t.moveYOffset - Math.pow(t.moveYChildOffset * a, 1 + t.moveYSpring) + e) * Math.PI * 2 / t.moveYTime) * t.moveYRange * Math.pow(1 + a * t.moveYAffectByLevel, 1 + t.springLevel) + t.moveYCenter;
                n.y = this.mixValue(n.y, m + v, o)
            }
            n.children.forEach((function (n: any, u: any) {
                var l = s ? r.children[u] : null;
                i.updateSineMode(t, e, n, l, a + 1, o)
            }
            ))
        }
    }

    public updateWiggleMode(t: any, e: any, n: any, r: any, i: any, ...args: any[]) {
        for (var a = arguments.length > 5 && void 0 !== arguments[5] ? arguments[5] : .5, o = 0, s = 1, u = n + 1, l = 1 / (2 - 1 / Math.pow(2, u - 1)), c = l, h = 0, f = 0; f < u; f++)
            o += s * Math.sin(r * c * Math.PI * 2 / t + i),
                c = l * Math.pow(1.5, f + 1),
                h += s,
                s *= a;
        return o / h * e
    }

    public updatePhysicMode(t: any, e: any, n: any, r: any, i: any, a: any) {
        var o = this
            , s = Math.min(t.limitRange, Math.max(-t.limitRange, n.autoMovePrevWorldX - n.worldXData))
            , u = Math.min(t.limitRange, Math.max(-t.limitRange, n.autoMovePrevWorldY - n.worldYData));
        e.speedX += (t.affectByX * s - e.speedX) * t.speed * i,
            e.speedY += (t.affectByY * u - e.speedY) * t.speed * i,
            n.autoMovePrevWorldX = n.worldXData,
            n.autoMovePrevWorldY = n.worldYData;
        var l = t.affectByRange * (-e.speedX * n.c + e.speedY * n.d);
        n.rotation = this.mixValue(n.rotation, l + n.initRotation, a),
            e.buffer.push({
                time: r,
                delta: l
            }),
            e.buffer.length > 300 && e.buffer.shift(),
            n.children.forEach((function (n: any) {
                o.updateFollowMode(t, e, n, r, 1, a)
            }
            ))
    }

    public updateFollowMode(t: any, e: any, n: any, r: any, i: any, a: any) {
        var o = this;
        this.endBoneName.includes(n.data.name) || (n.rotation = this.mixValue(n.rotation, n.initRotation + this.getHistoryRotate(r - t.delay * (1 + i * t.spring), e.buffer) * t.rotateMoveRange * Math.pow(1 + i * t.affectByLevel, 1 + t.springLevel), a),
            n.children.forEach((function (n: any) {
                o.updateFollowMode(t, e, n, r, i + 1, a)
            }
            )))
    }

    public updateSpringMagic(t: any, e: any, n: any, r: any, i: any, a: any, o: any, s: any) {
        var u = this;
        if (!this.endBoneName.includes(e.data.name)) {
            AutoBone.updateWorldTransform(e),
                e.autoMovePrevWorldX = e.worldXData,
                e.autoMovePrevWorldY = e.worldYData;
            var l = n && n.data.name !== this.targetEndBoneName
                , c = l ? this.mixValue(e.initRotation, n.rotation, this.targetWeight) : e.initRotation
                , h = t.springUseTarget && n ? n : e
                , f = 1 + a * t.affectByLevel
                , d = Math.pow(f, 1 + t.springLevel)
                , p = t.delay * d * (1 + t.springRot * f) * i * (0 === a ? 1 + t.spring : 1)
                , v = t.friction
                , m = t.forceX
                , g = t.forceY
                , y = 1 - t.windAccel;
            if (e.children.length > 0)
                e.children.forEach((function (f: any, d: any) {
                    if (0 === d) {
                        var _ = f.x
                            , x = f.y
                            , b = _ * h.a + x * h.b + e.worldXData
                            , w = _ * h.c + x * h.d + e.worldYData;
                        b = (b - f.autoMovePrevWorldX) * p,
                            w = (w - f.autoMovePrevWorldY) * p,
                            e.autoMoveSpeedX += b,
                            e.autoMoveSpeedY += w,
                            e.autoMoveSpeedX *= v,
                            e.autoMoveSpeedY *= v,
                            e.autoMoveSpeedX += m * t.windAccel,
                            e.autoMoveSpeedY += g * t.windAccel;
                        var M = f.autoMovePrevWorldX + e.autoMoveSpeedX + m * y
                            , S = f.autoMovePrevWorldY + e.autoMoveSpeedY + g * y
                            , k = AutoBone.worldToLocalRotation(e, s * Math.atan2(S - e.worldYData, s * (M - e.worldXData)) * (180 / Math.PI) + (0 === a ? t.rotateOffset : 0))
                            , T = Math.min(t.limitRange, Math.max(-t.limitRange, k - c)) + c;
                        e.rotation = u.mixValue(e.rotation, c * t.speed + (1 - t.speed) * T, o * e.autoMoveFriction),
                            AutoBone.updateWorldTransform(e)
                    }
                    var A = l ? n.children[d] : null;
                    u.updateSpringMagic(t, f, A, r, i, a + 1, o, s)
                }
                ));
            else {
                var _ = e.x
                    , x = e.y
                    , b = _ * h.a + x * h.b + e.worldXData
                    , w = _ * h.c + x * h.d + e.worldYData;
                b = (b - e.tailAutoMovePrevWorldX) * p,
                    w = (w - e.tailAutoMovePrevWorldY) * p,
                    e.autoMoveSpeedX += b,
                    e.autoMoveSpeedY += w,
                    e.autoMoveSpeedX *= v,
                    e.autoMoveSpeedY *= v,
                    e.autoMoveSpeedX += m * t.windAccel,
                    e.autoMoveSpeedY += g * t.windAccel;
                var M = e.tailAutoMovePrevWorldX + e.autoMoveSpeedX + m * y
                    , S = e.tailAutoMovePrevWorldY + e.autoMoveSpeedY + g * y
                    , k = AutoBone.worldToLocalRotation(e, s * Math.atan2(S - e.worldYData, s * (M - e.worldXData)) * (180 / Math.PI) + (0 === a ? t.rotateOffset : 0))
                    , T = Math.min(t.limitRange, Math.max(-t.limitRange, k - c)) + c;
                e.rotation = this.mixValue(e.rotation, c * t.speed + (1 - t.speed) * T, o * e.autoMoveFriction),
                    AutoBone.updateWorldTransform(e),
                    e.tailAutoMovePrevWorldX = _ * e.a + x * e.b + e.worldXData,
                    e.tailAutoMovePrevWorldY = _ * e.c + x * e.d + e.worldYData
            }
            e.autoMoveFriction += .1 * (1 - e.autoMoveFriction) * i
        }
    }

    public updateElasic(t: any, e: any, n: any, r: any) {
        if (!this.endBoneName.includes(e.data.name)) {
            var i = e.parent,
                a = e.initX
                , o = e.initY
                , s = a * i.a + o * i.b + i.worldXData
                , u = a * i.c + o * i.d + i.worldYData
                , l = (s - e.autoMovePrevWorldX) * t.elasticSpring * n
                , c = (u - e.autoMovePrevWorldY) * t.elasticSpringY * n;
            e.elasticSpeedX += l,
                e.elasticSpeedX *= t.elasticFriction,
                e.elasticSpeedY += c,
                e.elasticSpeedY *= t.elasticFrictionY,
                e.autoMovePrevWorldX += e.elasticSpeedX,
                e.autoMovePrevWorldY += e.elasticSpeedY;
            var h = AutoBone.worldToLocal(i, {
                x: e.autoMovePrevWorldX,
                y: e.autoMovePrevWorldY
            })
                , f = h.x
                , d = h.y;
            isNaN(f) || isNaN(d) || (e.x = this.mixValue(e.x, f * t.elasticSoftness + (1 - t.elasticSoftness) * e.initX, r * e.autoMoveFriction),
                e.y = this.mixValue(e.y, d * t.elasticSoftnessY + (1 - t.elasticSoftnessY) * e.initY, r * e.autoMoveFriction),
                e.autoMoveFriction += .1 * (1 - e.autoMoveFriction) * n)
        }
    }

    public updateKeyFrameMode(t: any, e: any, n: any, r: any) {
        var i = n + t.delay + 1e3
            , a: any = void 0
            , o: any = void 0
            , s: any = void 0
            , u: any = void 0
            , l: any = void 0
            , c: any = void 0
            , h: any = void 0;
        t.xFramesEnd > 0 && (a = i % t.xFramesEnd,
            o = Frame.getBlock(t.xFrames, a),
            s = o.start.value,
            u = o.end.value,
            l = o.start.start,
            c = o.end.start,
            h = o.end.easeFunc,
            e.x = this.mixValue(e.x, (u - s) * h((a - l) / (c - l)) + s, r)),
            t.yFramesEnd > 0 && (a = i % t.yFramesEnd,
                o = Frame.getBlock(t.yFrames, a),
                s = o.start.value,
                u = o.end.value,
                l = o.start.start,
                c = o.end.start,
                h = o.end.easeFunc,
                e.y = this.mixValue(e.y, (u - s) * h((a - l) / (c - l)) + s, r)),
            t.sxFramesEnd > 0 && (a = i % t.sxFramesEnd,
                o = Frame.getBlock(t.sxFrames, a),
                s = o.start.value,
                u = o.end.value,
                l = o.start.start,
                c = o.end.start,
                h = o.end.easeFunc,
                e.scaleX = this.mixValue(e.scaleX, (u - s) * h((a - l) / (c - l)) + s, r),
                t.sYSameAsSX ? e.scaleY = e.scaleX : t.syFramesEnd > 0 && (a = i % t.syFramesEnd,
                    o = Frame.getBlock(t.syFrames, a),
                    s = o.start.value,
                    u = o.end.value,
                    l = o.start.start,
                    c = o.end.start,
                    h = o.end.easeFunc,
                    e.scaleY = this.mixValue(e.scaleY, (u - s) * h((a - l) / (c - l)) + s, r)))
    }

    public get currentTrackName() {
        return this.spineObj.state.tracks[0] ? this.spineObj.state.tracks[0].animation.name : ""
    }

    public get currentAnimation() {
        return this.spineObj.state.tracks[0] ? (this.animation[this.spineObj.state.tracks[0].animation.name] || this.defaultAnimation) : this.defaultAnimation
    }

    public get defaultAnimation() {
        return this.animation.default
    }

    public static createAnimation(t: any) {
        switch (t.mode) {
            case 1:
                return new BoneAnimationSine(t);
            case 2:
                return new BoneAnimationPhysic(t);
            case 3:
                return new BoneAnimationWiggle(t);
            case 4:
                return new BoneAnimationSpringMagic(t);
            case 5:
                return new BoneAnimationElasic(t);
            case 6:
                return new BoneAnimationKeyFrame(t);
            default:
                return new BoneAnimation(t);
        }
    }
}

class BoneAnimation {
    public name!: string;
    public mode!: number;

    public constructor(config: any) {
        this.name = config.name ?? "";
        this.mode = config.mode ?? 1;
    }

    public createHistory(): any {
        return null;
    }

    public clone() {
        return new BoneAnimation({ name: this.name, mode: this.mode });
    }
}

class BoneAnimationSine extends BoneAnimation {
    public rotateOffset!: number;
    public rotateCenter!: number;
    public rotateTime!: number;
    public rotateRange!: number;
    public affectByLevel!: number;
    public springLevel!: number;
    public spring!: number;
    public childOffset!: number;
    public scaleYRange!: number;
    public scaleYCenter!: number;
    public scaleYTime!: number;
    public scaleYOffset!: number;
    public scaleYChildOffset!: number;
    public scaleYSpring!: number;
    public scaleYAffectByLevel!: number;
    public scaleXRange!: number;
    public scaleXCenter!: number;
    public scaleXTime!: number;
    public scaleXOffset!: number;
    public scaleXChildOffset!: number;
    public scaleXSpring!: number;
    public scaleXAffectByLevel!: number;
    public sinScaleXSameAsY!: boolean;
    public moveXRange!: number;
    public moveXTime!: number;
    public moveXSpring!: number;
    public moveXChildOffset!: number;
    public moveXAffectByLevel!: number;
    public moveXOffset!: number;
    public moveXCenter!: number;
    public moveYRange!: number;
    public moveYTime!: number;
    public moveYSpring!: number;
    public moveYChildOffset!: number;
    public moveYAffectByLevel!: number;
    public moveYOffset!: number;
    public moveYCenter!: number;

    public constructor(config: any) {
        super(config);
        this.copy(config);
    }

    public copy(config: any) {
        this.rotateOffset = config.rotateOffset ?? 0;
        this.rotateCenter = config.rotateCenter ?? 0;
        this.rotateTime = config.rotateTime ?? 2;
        this.rotateRange = config.rotateRange ?? 10;
        this.affectByLevel = config.affectByLevel ?? 0.1;
        this.springLevel = config.springLevel ?? 0;
        this.spring = config.spring ?? 0;
        this.childOffset = config.childOffset ?? 0.25;
        this.scaleYRange = config.scaleYRange ?? 0;
        this.scaleYCenter = config.scaleYCenter ?? 0;
        this.scaleYTime = config.scaleYTime ?? 2;
        this.scaleYOffset = config.scaleYOffset ?? 0;
        this.scaleYChildOffset = config.scaleYChildOffset ?? 0.25;
        this.scaleYSpring = config.scaleYSpring ?? 0;
        this.scaleYAffectByLevel = config.scaleYAffectByLevel ?? 0.1;
        this.scaleXRange = config.scaleXRange ?? 0;
        this.scaleXCenter = config.scaleXCenter ?? 0;
        this.scaleXTime = config.scaleXTime ?? 2;
        this.scaleXOffset = config.scaleXOffset ?? 0;
        this.scaleXChildOffset = config.scaleXChildOffset ?? 0.25;
        this.scaleXSpring = config.scaleXSpring ?? 0;
        this.scaleXAffectByLevel = config.scaleXAffectByLevel ?? 0.1;
        this.sinScaleXSameAsY = (this.scaleXRange === this.scaleYRange) && (this.scaleXCenter === this.scaleYCenter) && (this.scaleXTime === this.scaleYTime) && (this.scaleXOffset === this.scaleYOffset) && (this.scaleXChildOffset === this.scaleYChildOffset) && (this.scaleXSpring === this.scaleYSpring) && (this.scaleXAffectByLevel === this.scaleYAffectByLevel);
        this.moveXRange = config.moveXRange ?? 0
        this.moveXTime = config.moveXTime ?? 2
        this.moveXSpring = config.moveXSpring ?? 0
        this.moveXChildOffset = config.moveXChildOffset ?? 0.25
        this.moveXAffectByLevel = config.moveXAffectByLevel ?? 0.1
        this.moveXOffset = config.moveXOffset ?? 0
        this.moveXCenter = config.moveXCenter ?? 0
        this.moveYRange = config.moveYRange ?? 0
        this.moveYTime = config.moveYTime ?? 2
        this.moveYSpring = config.moveYSpring ?? 0
        this.moveYChildOffset = config.moveYChildOffset ?? 0.25
        this.moveYAffectByLevel = config.moveYAffectByLevel ?? 0.1
        this.moveYOffset = config.moveYOffset ?? 0
        this.moveYCenter = config.moveYCenter ?? 0
    }
}

class BoneAnimationPhysic extends BoneAnimation {
    public delay!: number;
    public speed!: number;
    public affectByRange!: number;
    public affectByX!: number;
    public affectByY!: number;
    public rotateMoveRange!: number;
    public spring!: number;
    public affectByLevel!: number;
    public springLevel!: number;
    public limitRange!: number;

    public constructor(config: any) {
        super(config);
        this.copy(config);
    }

    public copy(config: any) {
        this.delay = config.delay ?? 0.1;
        this.speed = config.speed ?? 0.1;
        this.affectByRange = config.affectByRange ?? 1;
        this.affectByX = config.affectByX ?? 1;
        this.affectByY = config.affectByY ?? 1;
        this.rotateMoveRange = config.rotateMoveRange ?? 1;
        this.spring = config.spring ?? 0;
        this.affectByLevel = config.affectByLevel ?? 0;
        this.springLevel = config.springLevel ?? 0;
        this.limitRange = config.limitRange ?? 10;
    }

    public createHistory() {
        return {
            speedX: 0,
            speedY: 0,
            buffer: []
        }
    }
}

class BoneAnimationWiggle extends BoneAnimation {
    public moveXFreq!: number;
    public moveXAmp!: number;
    public moveXOctaves!: number;
    public moveXDelay!: number;
    public moveXCenter!: number;
    public moveXSeed!: number;
    public moveYFreq!: number;
    public moveYAmp!: number;
    public moveYOctaves!: number;
    public moveYDelay!: number;
    public moveYCenter!: number;
    public moveYSameAsX!: boolean;
    public scaleXFreq!: number;
    public scaleXAmp!: number;
    public scaleXOctaves!: number;
    public scaleXDelay!: number;
    public scaleXCenter!: number;
    public scaleYFreq!: number;
    public scaleYAmp!: number;
    public scaleYOctaves!: number;
    public scaleYDelay!: number;
    public scaleYCenter!: number;
    public scaleYSameAsX!: boolean;
    public rotateSpeed!: number;
    public rotateFreq!: number;
    public rotateAmp!: number;
    public rotateOctaves!: number;
    public rotateDelay!: number;
    public rotateCenter!: number;
    public rotateFollowLimit!: number;
    public rotateFollowEnable!: boolean;
    public rotateFollowSpeed!: number;
    public rotateFollowFlip!: number;
    public rotateFollowXMax!: number;
    public rotateFollowYMax!: number;

    public constructor(config: any) {
        super(config);
        this.copy(config);
    }

    public copy(config: any) {
        this.moveXFreq = config.moveXFreq ?? 1;
        this.moveXAmp = config.moveXAmp ?? 0;
        this.moveXOctaves = config.moveXOctaves ?? 0;
        this.moveXDelay = config.moveXDelay ?? 0;
        this.moveXCenter = config.moveXCenter ?? 0;
        this.moveXSeed = config.moveXSeed ?? Math.floor(1e4 * Math.random());
        this.moveYFreq = config.moveYFreq ?? this.moveXFreq;
        this.moveYAmp = config.moveYAmp ?? this.moveXAmp;
        this.moveYOctaves = config.moveYOctaves ?? this.moveXOctaves;
        this.moveYDelay = config.moveYDelay ?? this.moveXDelay;
        this.moveYCenter = config.moveYCenter ?? this.moveXCenter;
        this.moveYSameAsX = (this.moveXFreq === this.moveYFreq) && (this.moveXAmp === this.moveYAmp) && (this.moveXOctaves === this.moveYOctaves) && (this.moveXDelay === this.moveYDelay) && (this.moveXCenter === this.moveYCenter);
        this.scaleXFreq = config.scaleXFreq ?? 1;
        this.scaleXAmp = config.scaleXAmp ?? 0;
        this.scaleXOctaves = config.scaleXOctaves ?? 0;
        this.scaleXDelay = config.scaleXDelay ?? 0;
        this.scaleXCenter = config.scaleXCenter ?? 0;
        this.scaleYFreq = config.scaleYFreq ?? this.scaleXFreq;
        this.scaleYAmp = config.scaleYAmp ?? this.scaleXAmp;
        this.scaleYOctaves = config.scaleYOctaves ?? this.scaleXOctaves;
        this.scaleYDelay = config.scaleYDelay ?? this.scaleXDelay;
        this.scaleYCenter = config.scaleYCenter ?? this.scaleXCenter;
        this.scaleYSameAsX = (this.scaleXFreq === this.scaleYFreq) && (this.scaleXAmp === this.scaleYAmp) && (this.scaleXOctaves === this.scaleYOctaves) && (this.scaleXDelay === this.scaleYDelay) && (this.scaleXCenter === this.scaleYCenter);
        this.rotateSpeed = config.rotateSpeed ?? 0;
        this.rotateFreq = config.rotateFreq ?? 1;
        this.rotateAmp = config.rotateAmp ?? 0;
        this.rotateOctaves = config.rotateOctaves ?? 0;
        this.rotateDelay = config.rotateDelay ?? 0;
        this.rotateCenter = config.rotateCenter ?? 0;
        this.rotateFollowLimit = config.rotateFollowLimit ?? 0;
        this.rotateFollowEnable = 0 !== this.rotateFollowLimit;
        this.rotateFollowSpeed = config.rotateFollowSpeed ?? 0.1;
        this.rotateFollowFlip = config.rotateFollowFlip ?? 0;
        this.rotateFollowXMax = config.rotateFollowXMax ?? 20;
        this.rotateFollowYMax = config.rotateFollowYMax ?? 20;
    }
}

class BoneAnimationSpringMagic extends BoneAnimation {
    public delay!: number;
    public speed!: number;
    public spring!: number;
    public springRot!: number;
    public affectByLevel!: number;
    public springLevel!: number;
    public limitRange!: number;
    public rotateOffset!: number;
    public friction!: number;
    public springUseTarget!: any;
    public windX!: number;
    public windY!: number;
    public windFreq!: number;
    public windAccel!: number;
    public windDelay!: number;
    public windOctaves!: number;
    public gravityX!: number;
    public gravityY!: number;
    public hasWindForce!: number;

    public constructor(config: any) {
        super(config);
        this.copy(config);
    }
    public copy(config: any) {
        this.delay = config.delay ?? 0.1;
        this.speed = config.speed ?? 0.1;
        this.spring = config.spring ?? 0;
        this.affectByLevel = config.affectByLevel ?? 0;
        this.springRot = config.springRot ?? 0;
        this.springLevel = config.springLevel ?? 0;
        this.limitRange = config.limitRange ?? 80;
        this.rotateOffset = config.rotateOffset ?? 0;
        this.friction = config.friction ?? 0.7;
        this.springUseTarget = void 0 !== config.springUseTarget && config.springUseTarget;
        this.windX = config.windX ?? 0;
        this.windY = config.windY ?? 0;
        this.windFreq = config.windFreq ?? 1;
        this.windAccel = config.windAccel ?? 1;
        this.windDelay = config.windDelay ?? 0;
        this.windOctaves = config.windOctaves ?? 0;
        this.gravityX = config.gravityX ?? 0;
        this.gravityY = config.gravityY ?? 0;
        this.hasWindForce = this.windX || this.windY;
    }
}

class BoneAnimationElasic extends BoneAnimation {
    public elasticSpring!: number;
    public elasticFriction!: number;
    public elasticSoftness!: number;
    public elasticSpringY!: number;
    public elasticFrictionY!: number;
    public elasticSoftnessY!: number;

    public constructor(config: any) {
        super(config);
        this.copy(config);
    }

    public copy(config: any) {
        this.elasticSpring = config.elasticSpring ?? 0.4;
        this.elasticFriction = config.elasticFriction ?? 0.6;
        this.elasticSoftness = config.elasticSoftness ?? 1;
        this.elasticSpringY = config.elasticSpringY ?? this.elasticSpring;
        this.elasticFrictionY = config.elasticFrictionY ?? this.elasticFriction;
        this.elasticSoftnessY = config.elasticSoftnessY ?? this.elasticSoftness;
    }
}

class BoneAnimationKeyFrame extends BoneAnimation {
    public delay!: number;
    public xFrames!: Array<Frame>;
    public xFramesEnd!: number;
    public yFrames!: Array<Frame>;
    public yFramesEnd!: number;
    public sxFrames!: Array<Frame>;
    public sxFramesEnd!: number;
    public syFrames!: Array<Frame>;
    public syFramesEnd!: number;
    public sYSameAsSX!: boolean;

    public constructor(config: any) {
        super(config);
        this.copy(config);
    }

    public copy(config: any) {
        this.delay = config.delay ?? 0;
        this.xFrames = (config.xFrames ?? []).map((frame: any) => new Frame(frame));
        this.xFramesEnd = this.xFrames.length ? this.xFrames[this.xFrames.length - 1].start : 0;
        this.yFrames = (config.yFrames ?? []).map((frame: any) => new Frame(frame));
        this.yFramesEnd = this.yFrames.length ? this.yFrames[this.yFrames.length - 1].start : 0;
        this.sxFrames = (config.sxFrames ?? []).map((frame: any) => new Frame(frame));
        this.sxFramesEnd = this.sxFrames.length ? this.sxFrames[this.sxFrames.length - 1].start : 0;
        this.sYSameAsSX = 0 === (config.syFrames ?? []).length;
        if (this.sYSameAsSX) {
            this.syFrames = [];
            this.syFramesEnd = 0;
        } else {
            this.syFrames = (config.syFrames ?? []).map((frame: any) => new Frame(frame));
            this.syFramesEnd = this.syFrames.length ? this.syFrames[this.syFrames.length - 1].start : 0;
        }
    }
}

class Frame {
    public value!: number;
    public start!: number;
    public ease!: string;

    public constructor(config: any) {
        this.value = config.value ?? 1;
        this.start = config.start ?? 0;
        this.ease = config.ease ?? 'linear';
    }

    public get easeFunc() {
        const t = this.ease
        const u = {
            sine: gsap.Sine,
            linear: gsap.Linear,
            power2: gsap.Power2,
            power3: gsap.Power3,
            power4: gsap.Power4,
            back: gsap.Back,
            elastic: gsap.Elastic,
            bounce: gsap.Bounce
        };
        const l = {
            in: "easeIn",
            out: "easeOut",
            inout: "easeInOut",
            none: "easeNone"
        };
        const c: Record<string, any> = {};
        try {
            if (0 === t.indexOf("custom ")) {
                var e = t.substring(7);
                return c[e] || (c[e] = CustomEase.create(e, e)),
                    c[e]
            }
        } catch (e) { }
        var n = t.toLowerCase().split(".")
            , r = n[0]
            , i = (l as Record<string, string>)[n[1]] || l.none;
        return (u as Record<string, any>)[r] ? (u as Record<string, any>)[r][i] : gsap.Linear.easeNone
    }

    public static getBlock(frames: Frame[], currentTime: number) {
        for (let i = frames.length - 1; i > 0; i--) {
            if (frames[i].start >= currentTime && frames[i - 1].start <= currentTime) {
                return {
                    end: frames[i],
                    start: frames[i - 1]
                };
            }
        }
    }
}

class BoneAnimationHistory {
    public current!: any;
    public previous!: any;
    public currentTrackName!: any;

    public constructor() {
        this.current = null;
        this.previous = null;
        this.currentTrackName = '';
    }

    public check(currentTrackName: any, currentAnimation: any) {
        if (currentTrackName !== this.currentTrackName) {
            this.previous = this.current;
            this.current = currentAnimation.createHistory();
            this.currentTrackName = currentTrackName;
        }
    }
}

class AutoBoneSpeed {
    public timeScale!: number;

    public constructor(config: any) {
        this.timeScale = config.timeScale ?? 1;
    }
}

class AutoSlot {
    public animation: Record<string, any>;;
    public spineObj!: any;
    public slot!: any;

    public constructor(extraSlot: any, spineObj: any) {
        this.animation = {};
        if (extraSlot && extraSlot.animation) {
            Object.keys(extraSlot.animation).forEach(key => {
                this.animation[key] = AutoSlot.createAnimation(extraSlot.animation[key]);
            });
        }
        this.spineObj = spineObj;
        if (extraSlot && extraSlot.slotName) {
            this.slot = spineObj.skeleton.slots.find((slot: any) => slot.data.name === extraSlot.slotName);
        }
    }

    public static createAnimation(config: any) {
        switch (config.mode) {
            case 1:
                return new SlotAnimationSine(config);
            case 2:
                return new SlotAnimationTween(config);
            default:
                return new SlotAnimation(config);
        }
    }

    public render(time: number) {
        const animation = this.currentAnimation;
        if (animation.mode === 1) {
            this.updateSineMode(animation, time);
        } else if (animation.mode === 2) {
            this.updateTweenMode(animation, time);
        }
    }

    public updateSineMode(animation: SlotAnimationSine, time: number) {
        this.slot.color.a = (0.5 + 0.5 * Math.sin((time + animation.delay) * Math.PI * 2 / animation.blinkTime)) * (animation.max - animation.min) + animation.min;
    }

    public updateTweenMode(animation: SlotAnimationTween, time: number) {
        if (animation.framesEnd !== 0) {
            const n = (time + animation.delay + 1000) % animation.framesEnd;
            const block = Frame.getBlock(animation.frames, n);
            if (block) {
                this.slot.color.a = (block.end.value - block.start.value) * (n - block.start.start) / (block.end.start - block.start.start) + block.start.value;
            }
        }
    }

    public get currentAnimation() {
        return this.spineObj.state.tracks[0] ? (this.animation[this.spineObj.state.tracks[0].animation.name] || this.defaultAnimation) : this.defaultAnimation;
    }

    public get defaultAnimation() {
        return this.animation.default;
    }
}

class SlotAnimation {
    public name!: string;
    public mode!: number;
    public delay!: number;

    public constructor(config: any) {
        this.name = config.name ?? "";
        this.mode = config.mode ?? 1;
        this.delay = config.delay ?? 0;
    }
}

class SlotAnimationSine extends SlotAnimation {
    public blinkTime!: number;
    public min!: number;
    public max!: number;

    public constructor(config: any) {
        super(config);
        this.blinkTime = config.blinkTime ?? 1;
        this.min = config.min ?? 0;
        this.max = config.max ?? 1;
    }
}

class SlotAnimationTween extends SlotAnimation {
    public frames: Frame[];
    public framesEnd!: number;

    public constructor(config: any) {
        super(config);
        this.frames = (config.frames ?? []).map((frame: any) => new Frame(frame));
        this.framesEnd = this.frames[this.frames.length - 1]?.start ?? 0;
    }
}

export {
    AutoBone,
    AutoBoneSpeed,
    AutoSlot
}