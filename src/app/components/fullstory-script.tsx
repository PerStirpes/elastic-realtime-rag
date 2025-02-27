"use client"

import { useEffect } from "react"

export function FullStoryScript() {
    useEffect(() => {
        /* eslint-disable @typescript-eslint/no-unused-expressions */
        // @ts-nocheck
        window._fs_host = window._fs_host || "fullstory.com"
        const _fs_script = "edge.fullstory.com/s/fs.js"
        window._fs_script = _fs_script
        window._fs_org = process.env.NEXT_PUBLIC_FS_ORG_ID || "o-2121BN-na1"
        window._fs_namespace = "FS"
        ;((m, n, e, t, l, o, g, y) => {
            if (e in m) {
                if (m.console && m.console.log) {
                    m.console.log('FullStory namespace conflict. Please set window["_fs_namespace"].')
                }
                return
            }
            g = m[e] = (a, b, s) => {
                g.q ? g.q.push([a, b, s]) : g._api(a, b, s)
            }
            g.q = []
            o = n.createElement(t)
            o.async = 1
            o.crossOrigin = "anonymous"
            o.src = "https://" + _fs_script
            y = n.getElementsByTagName(t)[0]
            y.parentNode.insertBefore(o, y)
            g.identify = (i, v, s) => {
                g(l, { uid: i }, s)
                if (v) g(l, v, s)
            }
            g.setUserVars = (v, s) => {
                g(l, v, s)
            }
            g.event = (i, v, s) => {
                g("event", { n: i, p: v }, s)
            }
            g.anonymize = () => {
                g.identify(!!0)
            }
            g.shutdown = () => {
                g("rec", !1)
            }
            g.restart = () => {
                g("rec", !0)
            }
            g.log = (a, b) => {
                g("log", [a, b])
            }
            g.consent = (a) => {
                g("consent", !arguments.length || a)
            }
            g.identifyAccount = (i, v) => {
                o = "account"
                v = v || {}
                v.acctId = i
                g(o, v)
            }
            g.clearUserCookie = () => {}
            g.setVars = (n, p) => {
                g("setVars", [n, p])
            }
            g._w = {}
            y = "XMLHttpRequest"
            g._w[y] = m[y]
            y = "fetch"
            g._w[y] = m[y]
            if (m[y])
                m[y] = function () {
                    return g._w[y].apply(this, arguments)
                }
            g._v = "2.0.0"
        })(window, document, window._fs_namespace, "script", "user")
    }, [])

    return null
}

// Add TypeScript definitions
declare global {
    interface Window {
        FS?: any
        _fs_host?: string
        _fs_script?: string
        _fs_org?: string
        _fs_namespace?: string
    }
}

// "use client"

// import { useEffect } from "react"

// export function FullStoryScript() {
//   useEffect(() => {
//     if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_FS_ORG_ID) {
//       window.FS = window.FS || {}
//       window._fs_host = window._fs_host || "fullstory.com"
//       const _fs_script = "edge.fullstory.com/s/fs.js"
//       window._fs_script = _fs_script
//       window._fs_org = 'o-2121BN-na1'
//       window._fs_namespace = "FS"
//         // @ts-ignore
//       ;!function p(b){var h,d=[];function j(){h&&(d.forEach((function(b){var d;try{d=b[h[0]]&&b[h[0]](h[1])}catch(h){return void(b[3]&&b[3](h))}
// d&&d.then?d.then(b[2],b[3]):b[2]&&b[2](d)})),d.length=0)}function r(b){return function(d){h||(h=[b,d],j())}}return b(r(0),r(1)),{
// then:function(b,h){return p((function(r,i){d.push([b,h,r,i]),j()}))}}}a&&(g=m[e]=function(){var b=function(b,d,j,r){function i(i,c){
// h(b,d,j,i,c,r)}r=r||2;var c,u=/Async$/;return u.test(b)?(b=b.replace(u,""),"function"==typeof Promise?new Promise(i):p(i)):h(b,d,j,c,c,r)}
// ;function h(h,d,j,r,i,c){return b._api?b._api(h,d,j,r,i,c):(b.q&&b.q.push([h,d,j,r,i,c]),null)}return b.q=[],b}(),y=function(b){function h(h){
// "function"==typeof h[4]&&h[4](new Error(b))}var d=g.q;if(d){for(var j=0;j<d.length;j++)h(d[j]);d.length=0,d.push=h}},function(){
// (o=n.createElement(t)).async=!0,o.crossOrigin="anonymous",o.src="https://"+l,o.onerror=function(){y("Error loading "+l)}
// ;var b=n.getElementsByTagName(t)[0];b&&b.parentNode?b.parentNode.insertBefore(o,b):n.head.appendChild(o)}(),function(){function b(){}
// function h(b,h,d){g(b,h,d,1)}function d(b,d,j){h("setProperties",{type:b,properties:d},j)}function j(b,h){d("user",b,h)}function r(b,h,d){j({
// uid:b},d),h&&j(h,d)}g.identify=r,g.setUserVars=j,g.identifyAccount=b,g.clearUserCookie=b,g.setVars=d,g.event=function(b,d,j){h("trackEvent",{
// name:b,properties:d},j)},g.anonymize=function(){r(!1)},g.shutdown=function(){h("shutdown")},g.restart=function(){h("restart")},
// g.log=function(b,d){h("log",{level:b,msg:d})},g.consent=function(b){h("setIdentity",{consent:!arguments.length||b})}}(),s="fetch",
// f="XMLHttpRequest",g._w={},g._w[f]=m[f],g._w[s]=m[s],m[s]&&(m[s]=function(){return g._w[s].apply(this,arguments)}),g._v="2.0.0")
// }(window,document,window._fs_namespace,"script",window._fs_script)
//     }
//   }, []);

//   return null
// }

// // Add TypeScript definitions
// declare global {
//   interface Window {
//     FS?: any
//     _fs_host?: string
//     _fs_script?: string
//     _fs_org?: string
//     _fs_namespace?: string
//   }
// }
