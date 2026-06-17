module.exports=[10179, a=> {
  "use strict";
  var b=a.i(87924), c=a.i(72131), d=a.i(50944), e=a.i(20266);
  a.s(["default", 0, function() {
    let a, f, g, h, i=(0, d.useRouter)(), [j, k]=(0, c.useState)(null), [l, m]=(0, c.useState)([]), [n, o]=(0, c.useState)([]), [p, q]=(0, c.useState)(!0), [r, s]=(0, c.useState)(null), [t, u]=(0, c.useState)(null), [v, w]=(0, c.useState)(null), [x, y]=(0, c.useState)( {
      
    }), [z, A]=(0, c.useState)(null), [B, C]=(0, c.useState)(""), [D, E]=(0, c.useState)(!1), [F, G]=(0, c.useState)(""), [H, I]=(0, c.useState)([]), [J, K]=(0, c.useState)([]), [L, M]=(0, c.useState)(null), [N, O]=(0, c.useState)(""), [P, Q]=(0, c.useState)(""), [R, S]=(0, c.useState)(!1), T=c.default.useRef(null), [U, V]=(0, c.useState)(10), [W, X]=(0, c.useState)([]), [Y, Z]=(0, c.useState)(""), [$, _]=(0, c.useState)(""), [aa, ab]=(0, c.useState)(""), [ac, ad]=(0, c.useState)(""), [ae, af]=(0, c.useState)(""), [ag, ah]=(0, c.useState)(""), [ai, aj]=(0, c.useState)("A"), [ak, al]=(0, c.useState)("points"), [am, an]=(0, c.useState)(50), [ao, ap]=(0, c.useState)(null), [aq, ar]=(0, c.useState)(""), [as, at]=(0, c.useState)(""), [au, av]=(0, c.useState)([]), [aw, ax]=(0, c.useState)(null), [ay, az]=(0, c.useState)( {
      
    }), aA=(0, c.useCallback)(async()=> {
      try {
        let a=await (0, e.getAdminDashboardData)();
        m(a.trainees), o(a.submissions);
        let b=await (0, e.getAdminMessages)();
        I(b);
        let c=await (0, e.getAllNotificationsForAdmin)();
        K(c);
        let d=await (0, e.getPointsPerProblem)();
        V(d);
        let f=await (0, e.getQuizzes)();
        X(f);
        let g=await (0, e.getQuizSubmissionsForAdmin)();
        av(g), f.length>0&&!aw&&ax(f[0].id)
      }catch(a) {
        console.error("Error fetching admin data:", a)
      }
    }, [aw]);
    (0, c.useEffect)(()=> {
      !async function() {
        let a=await (0, e.getSessionProfile)();
        a?a.is_admin?(a.name&&a.name.includes("Aether")&&(a.name=a.name.replace(/Aether/g, "Ascend")), k(a), await aA(), q(!1)):i.push("/"):i.push("/login")
      }()
    }, [i, aA]), (0, c.useEffect)(()=> {
      let a=setInterval(async()=> {
        try {
          let a=await (0, e.getAllNotificationsForAdmin)();
          K(a)
        }catch(a) {
          console.error("Error polling messages:", a)
        }
      }, 1e4);
      return()=>clearInterval(a)
    }, []), (0, c.useEffect)(()=> {
      T.current?.scrollIntoView( {
        behavior:"smooth"
      })
    }, [L, J]);
    let aB=(0, c.useCallback)(async a=> {
      M(a);
      try {
        await (0, e.markAllNotificationsRead)(a);
        let b=await (0, e.getAllNotificationsForAdmin)();
        K(b)
      }catch(a) {
        console.error("Error marking messages read:", a)
      }
    }, []), aC=(0, c.useCallback)(async a=> {
      if(a.preventDefault(), L&&P.trim()) {
        S(!0);
        try {
          await (0, e.adminSendNotification)(L, P.trim()), Q("");
          let a=await (0, e.getAllNotificationsForAdmin)();
          K(a)
        }catch(a) {
          console.error("Error sending reply:", a)
        }finally {
          S(!1)
        }
      }
    }, [L, P]), aD=(0, c.useCallback)(async()=> {
      await (0, e.logoutUser)(), i.push("/login")
    }, [i]), aE=(0, c.useCallback)(async a=> {
      u(a);
      try {
        await (0, e.adminRemoveStreak)(a), await aA()
      }catch(a) {
        console.error("Error removing streak:", a)
      }finally {
        u(null), w(null)
      }
    }, [aA]), aF=(0, c.useCallback)(async(a, b)=> {
      u(a);
      try {
        await (0, e.adminToggleFreezeStreak)(a, !b), await aA()
      }catch(a) {
        console.error("Error toggling freeze streak:", a)
      }finally {
        u(null)
      }
    }, [aA]);
    (0, c.useCallback)(async(a, b)=> {
      u(a);
      try {
        await (0, e.adminAdjustStreakFreezes)(a, b), await aA()
      }catch(a) {
        console.error("Error adjusting streak freezes:", a)
      }finally {
        u(null)
      }
    }, [aA]);
    let aG=(0, c.useCallback)(async()=> {
      if(z&&B.trim()) {
        E(!0);
        try {
          if("all"===z)await (0, e.adminSendNotificationToAll)(B.trim()), G("Broadcast notification sent to all trainees!");
          else {
            await (0, e.adminSendNotification)(z, B.trim());
            let a=l.find(a=>a.id===z);
            G(`Notification sent to $ {
              a?.name||"user"
            }!`)
          }C(""), A(null), setTimeout(()=>G(""), 3e3)
        }catch(a) {
          console.error("Error sending notification:", a)
        }finally {
          E(!1)
        }
      }
    }, [z, B, l]), aH=(0, c.useCallback)((a, b, c)=> {
      az(d=> {
        let e=l.find(b=>b.id===a), f=d[a]|| {
          streak:e?.streak.currentStreak??0, longestStreak:e?.streak.longestStreak??0, freezes:e?.streak_freezes??0, points:e?.points??0
        }, g=f[b]+c;
        return("streak"===b||"longestStreak"===b||"freezes"===b||"points"===b)&&(g=Math.max(0, g)),  {
          ...d, [a]: {
            ...f, [b]:g
          }
        }
      })
    }, [l]), aI=(0, c.useCallback)(a=> {
      az(b=> {
        let c= {
          ...b
        };
        return delete c[a], c
      })
    }, []), aJ=(0, c.useCallback)(async a=> {
      let b=l.find(b=>b.id===a);
      if(!b)return;
      let c=ay[a];
      if(!c)return;
      let d=b.streak.currentStreak, f=b.streak.longestStreak, g=b.streak_freezes??0, h=b.points??0, i=c.streak-d, j=c.longestStreak-f, k=c.freezes-g, m=c.points-h;
      if(0!==i||0!==j||0!==k||0!==m) {
        u(a);
        try {
          i>0?await (0, e.adminIncreaseStreak)(a, i):i<0&&await (0, e.adminDecreaseStreak)(a, Math.abs(i)), 0!==j&&await (0, e.adminAdjustLongestStreak)(a, j), 0!==k&&await (0, e.adminAdjustStreakFreezes)(a, k), 0!==m&&await (0, e.adminAdjustPoints)(a, m), az(b=> {
            let c= {
              ...b
            };
            return delete c[a], c
          }), await aA()
        }catch(a) {
          console.error("Error saving changes:", a), alert("Failed to save changes")
        }finally {
          u(null)
        }
      }
    }, [l, ay, aA]);
    (0, c.useCallback)((a, b)=> {
      y(c=>( {
        ...c, [a]:Math.max(1, b)
      }))
    }, []), (0, c.useCallback)(async(a, b)=> {
      let c=x[a]||1;
      u(a);
      try {
        await (0, e.adminAdjustPoints)(a, b?c:-c), await aA()
      }catch(a) {
        console.error("Error adjusting points:", a)
      }finally {
        u(null)
      }
    }, [x, aA]);
    let aK=(0, c.useCallback)(async()=> {
      try {
        await (0, e.updatePointsPerProblem)(U), alert("Points multiplier updated successfully!")
      }catch(a) {
        console.error(a), alert("Failed to update multiplier")
      }
    }, [U]), aL=(0, c.useCallback)(async a=> {
      if(a.preventDefault(), ar(""), at(""), !Y.trim()||!aa.trim()||!ac.trim()||!ae.trim()||!ag.trim())return void ar("Title and options A, B, C, D are required.");
      try {
        let a= {
          title:Y.trim(), description:$.trim()||null, option_a:aa.trim(), option_b:ac.trim(), option_c:ae.trim(), option_d:ag.trim(), correct_option:ai, reward_type:ak, reward_amount:am
        };
        ao?(await (0, e.updateQuiz)(ao, a), at("Quiz question updated successfully!")):(await (0, e.addQuiz)(a), at("Quiz question created successfully!")), Z(""), _(""), ab(""), ad(""), af(""), ah(""), aj("A"), al("points"), an(50), ap(null);
        let b=await (0, e.getQuizzes)();
        X(b)
      }catch(a) {
        console.error(a), ar(a.message||"Error saving quiz question.")
      }
    }, [ao, Y, $, aa, ac, ae, ag, ai, ak, am]), aM=(0, c.useCallback)(a=> {
      ap(a.id), Z(a.title), _(a.description||""), ab(a.option_a), ad(a.option_b), af(a.option_c), ah(a.option_d), aj(a.correct_option), al(a.reward_type), an(a.reward_amount)
    }, []), aN=(0, c.useCallback)(async a=> {
      if(confirm("Are you sure you want to delete this quiz question?"))try {
        await (0, e.deleteQuiz)(a);
        let b=await (0, e.getQuizzes)();
        X(b)
      }catch(a) {
        console.error("Error deleting quiz:", a)
      }
    }, []);
    return p?(0, b.jsxs)("div",  {
      className:"flex-center", style: {
        minHeight:"100vh", flexDirection:"column", gap:"1rem"
      }, children:[(0, b.jsx)("div",  {
        className:"spinner", style: {
          width:"40px", height:"40px", border:"4px solid rgba(14, 165, 233, 0.2)", borderTopColor:"var(--primary)", borderRadius:"50%", animation:"spin 1s linear infinite"
        }
      }), (0, b.jsx)("span",  {
        style: {
          color:"var(--foreground-muted)", fontWeight:500
        }, children:"Loading administrative data..."
      })]
    }):(0, b.jsxs)("div",  {
      style: {
        minHeight:"100vh", display:"flex", flexDirection:"column"
      }, children:[(0, b.jsxs)("header",  {
        className:"main-header", children:[(0, b.jsxs)("div",  {
          style: {
            display:"flex", alignItems:"center", gap:"0.75rem"
          }, children:[(0, b.jsx)("div",  {
            style: {
              background:"linear-gradient(135deg, #ef4444 0%, #f97316 100%)", padding:"8px", borderRadius:"10px", display:"flex", alignItems:"center", justifyContent:"center"
            }, children:(0, b.jsx)("svg",  {
              width:"20", height:"20", fill:"none", stroke:"white", strokeWidth:"2.5", viewBox:"0 0 24 24", children:(0, b.jsx)("path",  {
                strokeLinecap:"round", strokeLinejoin:"round", d:"M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              })
            })
          }), (0, b.jsxs)("div",  {
            style: {
              display:"flex", flexDirection:"column"
            }, children:[(0, b.jsxs)("h1",  {
              style: {
                fontSize:"1.25rem", fontWeight:800, letterSpacing:"0.05em", lineHeight:"1.1"
              }, children:["ASCEND ", (0, b.jsx)("span",  {
                style: {
                  fontWeight:300, color:"var(--foreground-muted)"
                }, children:"ADMIN"
              })]
            }), (0, b.jsx)("span",  {
              style: {
                fontSize:"0.65rem", fontWeight:500, color:"var(--foreground-muted)", letterSpacing:"0.05em"
              }, children:"by Consistency Club"
            })]
          })]
        }), (0, b.jsxs)("div",  {
          style: {
            display:"flex", alignItems:"center", gap:"1rem"
          }, children:[(0, b.jsx)("button",  {
            onClick:()=>i.push("/"), className:"btn-secondary", style: {
              padding:"0.4rem 0.8rem", fontSize:"0.8rem"
            }, children:"← Dashboard"
          }), (0, b.jsxs)("div",  {
            style: {
              display:"flex", alignItems:"center", gap:"0.5rem"
            }, children:[(0, b.jsx)("img",  {
              src:j?.avatar_url||"", alt:"Admin", style: {
                width:"32px", height:"32px", borderRadius:"50%", border:"1px solid rgba(255,255,255,0.2)"
              }
            }), (0, b.jsx)("span",  {
              style: {
                fontSize:"0.85rem", fontWeight:600
              }, children:j?.name?j.name.replace(/Aether/g, "Ascend"):""
            })]
          }), (0, b.jsx)("button",  {
            onClick:aD, className:"btn-secondary", style: {
              padding:"0.4rem 0.8rem", fontSize:"0.8rem"
            }, children:"Sign Out"
          })]
        })]
      }), (0, b.jsxs)("main",  {
        className:"admin-grid", style: {
          flexGrow:1, padding:"2rem", maxWidth:"1400px", width:"100%", margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"2rem"
        }, children:[(0, b.jsxs)("section",  {
          style: {
            display:"flex", flexDirection:"column", gap:"1.5rem", minWidth:0
          }, children:[(0, b.jsxs)("div",  {
            className:"glass-panel", style: {
              height:"100%"
            }, children:[(0, b.jsx)("h2",  {
              style: {
                fontSize:"1.2rem", fontWeight:700, marginBottom:"0.5rem", color:"var(--foreground)"
              }, children:"Trainee Streak Leaderboard"
            }), (0, b.jsx)("p",  {
              style: {
                fontSize:"0.8rem", color:"var(--foreground-muted)", marginBottom:"1rem"
              }, children:"Manage streaks, send notifications, and monitor all registered users."
            }), (0, b.jsx)("div",  {
              style: {
                display:"flex", justifyContent:"flex-start", marginBottom:"1.25rem"
              }, children:(0, b.jsx)("button",  {
                onClick:()=>A("all"===z?null:"all"), className:"btn-secondary", style: {
                  fontSize:"0.75rem", padding:"0.4rem 0.8rem", background:"all"===z?"rgba(14, 165, 233, 0.12)":void 0, border:"all"===z?"1px solid var(--primary)":void 0, display:"flex", alignItems:"center", gap:"4px"
                }, children:(0, b.jsx)("span",  {
                  children:"📢 Broadcast to All Trainees"
                })
              })
            }), "all"===z&&(0, b.jsxs)("div",  {
              className:"animate-fade-in", style: {
                background:"rgba(14, 165, 233, 0.04)", border:"1px solid rgba(14, 165, 233, 0.15)", borderRadius:"8px", padding:"0.75rem 1rem", display:"flex", gap:"0.5rem", alignItems:"center", marginBottom:"1.25rem"
              }, children:[(0, b.jsx)("svg",  {
                width:"16", height:"16", fill:"none", stroke:"var(--primary)", strokeWidth:"2", viewBox:"0 0 24 24", style: {
                  flexShrink:0
                }, children:(0, b.jsx)("path",  {
                  strokeLinecap:"round", strokeLinejoin:"round", d:"M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                })
              }), (0, b.jsx)("input",  {
                type:"text", className:"input-field", placeholder:"Broadcast message to all trainees...", value:B, onChange:a=>C(a.target.value), maxLength:200, style: {
                  fontSize:"0.8rem", padding:"0.5rem 0.75rem"
                }, onKeyDown:a=> {
                  "Enter"===a.key&&aG()
                }
              }), (0, b.jsx)("button",  {
                onClick:aG, disabled:D||!B.trim(), className:"btn-primary", style: {
                  padding:"0.45rem 0.8rem", fontSize:"0.75rem", whiteSpace:"nowrap", opacity:B.trim()?1:.5
                }, children:D?"Broadcasting...":"Broadcast"
              })]
            }), F&&(0, b.jsxs)("div",  {
              className:"animate-fade-in", style: {
                fontSize:"0.8rem", color:"var(--success)", background:"rgba(16, 185, 129, 0.08)", border:"1px solid rgba(16, 185, 129, 0.2)", padding:"0.6rem 0.8rem", borderRadius:"8px", marginBottom:"1rem", display:"flex", alignItems:"center", gap:"6px"
              }, children:[(0, b.jsx)("svg",  {
                width:"14", height:"14", fill:"none", stroke:"currentColor", strokeWidth:"2", viewBox:"0 0 24 24", children:(0, b.jsx)("path",  {
                  strokeLinecap:"round", strokeLinejoin:"round", d:"M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                })
              }), F]
            }), (0, b.jsx)("div",  {
              style: {
                display:"flex", flexDirection:"column", gap:"1.25rem"
              }, children:0===l.length?(0, b.jsx)("div",  {
                style: {
                  textAlign:"center", padding:"3rem 0", color:"var(--foreground-dark)"
                }, children:"No trainee profiles registered yet."
              }):l.map(a=> {
                let d=ay[a.id]|| {
                  streak:a.streak.currentStreak, longestStreak:a.streak.longestStreak, freezes:a.streak_freezes??0, points:a.points??0
                }, e=!!(ay[a.id]&&(d.streak!==a.streak.currentStreak||d.longestStreak!==a.streak.longestStreak||d.freezes!==(a.streak_freezes??0)||d.points!==(a.points??0)));
                return(0, b.jsx)(c.default.Fragment,  {
                  children:(0, b.jsxs)("div",  {
                    className:"glass-panel", style: {
                      padding:"1.5rem", borderRadius:"16px", background:"rgba(15, 23, 42, 0.45)", border:"1px solid var(--glass-border)", display:"flex", flexDirection:"column", gap:"1rem", opacity:t===a.id?.6:1, transition:"opacity 0.2s", position:"relative"
                    }, children:[(0, b.jsxs)("div",  {
                      style: {
                        display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"0.75rem"
                      }, children:[(0, b.jsxs)("div",  {
                        style: {
                          display:"flex", alignItems:"center", gap:"0.75rem"
                        }, children:[(0, b.jsx)("img",  {
                          src:a.avatar_url||"", alt:a.name, style: {
                            width:"42px", height:"42px", borderRadius:"50%", objectFit:"cover", border:"2px solid rgba(255,255,255,0.08)"
                          }
                        }), (0, b.jsxs)("div",  {
                          children:[(0, b.jsx)("div",  {
                            style: {
                              fontWeight:700, fontSize:"0.95rem", color:"#fff"
                            }, children:a.name
                          }), (0, b.jsx)("div",  {
                            style: {
                              fontSize:"0.75rem", color:"var(--foreground-dark)"
                            }, children:a.email||"N/A"
                          })]
                        })]
                      }), (0, b.jsxs)("div",  {
                        style: {
                          display:"flex", gap:"0.5rem", flexWrap:"wrap"
                        }, children:[(0, b.jsx)("button",  {
                          onClick:()=>aF(a.id, !!a.streak.isFrozen), disabled:t===a.id, className:"btn-secondary", style: {
                            background:a.streak.isFrozen?"rgba(56, 189, 248, 0.15)":"rgba(255, 255, 255, 0.05)", border:a.streak.isFrozen?"1px solid var(--primary)":"1px solid var(--glass-border)", color:a.streak.isFrozen?"#38bdf8":"var(--foreground-muted)", padding:"0.4rem 0.75rem", fontSize:"0.75rem", display:"flex", alignItems:"center", gap:"4px"
                          }, title:a.streak.isFrozen?"Unfreeze streak":"Freeze streak", children:a.streak.isFrozen?"❄️ Frozen":"🔥 Active"
                        }), (0, b.jsx)("button",  {
                          onClick:()=>A(z===a.id?null:a.id), className:"btn-secondary", style: {
                            padding:"0.4rem 0.6rem", fontSize:"0.75rem", background:z===a.id?"rgba(14, 165, 233, 0.15)":"rgba(255, 255, 255, 0.05)", border:z===a.id?"1px solid var(--primary)":"1px solid var(--glass-border)"
                          }, title:"Send Notification", children:"📩 Msg"
                        }), (0, b.jsx)("button",  {
                          onClick:()=>w(a.id), disabled:t===a.id, className:"btn-secondary", style: {
                            padding:"0.4rem 0.6rem", fontSize:"0.75rem", background:v===a.id?"rgba(239, 68, 68, 0.15)":"rgba(255, 255, 255, 0.05)", border:v===a.id?"1px solid var(--danger)":"1px solid var(--glass-border)", color:"var(--danger)"
                          }, title:"Reset all streaks", children:"🗑️ Reset"
                        })]
                      })]
                    }), (0, b.jsx)("div",  {
                      style: {
                        display:"flex", flexDirection:"column", gap:"0.4rem", background:"rgba(0,0,0,0.18)", padding:"0.75rem 0.8rem", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.03)"
                      }, children:(0, b.jsxs)("div",  {
                        style: {
                          display:"flex", justifyContent:"space-between", fontSize:"0.8rem", flexWrap:"wrap", gap:"0.5rem"
                        }, children:[(0, b.jsxs)("div",  {
                          children:[(0, b.jsx)("span",  {
                            style: {
                              color:"var(--foreground-muted)"
                            }, children:"Database Streak:"
                          }), " ", (0, b.jsxs)("strong",  {
                            style: {
                              color:a.streak.isFrozen?"#38bdf8":"#f97316"
                            }, children:[a.streak.isFrozen?"❄️":"🔥", " ", a.streak.currentStreak]
                          })]
                        }), (0, b.jsxs)("div",  {
                          children:[(0, b.jsx)("span",  {
                            style: {
                              color:"var(--foreground-muted)"
                            }, children:"Database Best Streak:"
                          }), " ", (0, b.jsx)("strong",  {
                            style: {
                              color:"var(--success)"
                            }, children:a.streak.longestStreak
                          })]
                        }), (0, b.jsxs)("div",  {
                          children:[(0, b.jsx)("span",  {
                            style: {
                              color:"var(--foreground-muted)"
                            }, children:"Stored Freezes:"
                          }), " ", (0, b.jsx)("strong",  {
                            style: {
                              color:"#38bdf8"
                            }, children:a.streak_freezes??0
                          })]
                        })]
                      })
                    }), (0, b.jsxs)("div",  {
                      style: {
                        display:"flex", flexDirection:"column", gap:"0.75rem", marginTop:"0.25rem"
                      }, children:[(0, b.jsxs)("div",  {
                        style: {
                          display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"0.75rem", background:"rgba(0, 0, 0, 0.25)", padding:"1rem", borderRadius:"12px", border:"1px solid rgba(255,255,255,0.04)"
                        }, children:[(0, b.jsxs)("div",  {
                          style: {
                            display:"flex", flexDirection:"column", alignItems:"center", gap:"0.35rem"
                          }, children:[(0, b.jsx)("span",  {
                            style: {
                              fontSize:"0.7rem", color:"var(--foreground-muted)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em"
                            }, title:"Current streak is automatically calculated from activity history.", children:"Streak"
                          }), (0, b.jsxs)("div",  {
                            style: {
                              display:"flex", alignItems:"center", gap:"0.5rem", marginTop:"0.2rem"
                            }, children:[(0, b.jsx)("span",  {
                              style: {
                                fontSize:"1.2rem", fontWeight:800, color:"#fff", minWidth:"24px", textAlign:"center"
                              }, children:d.streak
                            }), (0, b.jsxs)("div",  {
                              style: {
                                display:"flex", gap:"0.25rem"
                              }, children:[(0, b.jsx)("button",  {
                                type:"button", onClick:()=>aH(a.id, "streak", -1), style: {
                                  width:"32px", height:"32px", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.05)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontWeight:"bold", fontSize:"1rem", transition:"background 0.2s"
                                }, onMouseEnter:a=>a.currentTarget.style.background="rgba(255,255,255,0.1)", onMouseLeave:a=>a.currentTarget.style.background="rgba(255,255,255,0.05)", children:"-"
                              }), (0, b.jsx)("button",  {
                                type:"button", onClick:()=>aH(a.id, "streak", 1), style: {
                                  width:"32px", height:"32px", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.05)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontWeight:"bold", fontSize:"1rem", transition:"background 0.2s"
                                }, onMouseEnter:a=>a.currentTarget.style.background="rgba(255,255,255,0.1)", onMouseLeave:a=>a.currentTarget.style.background="rgba(255,255,255,0.05)", children:"+"
                              })]
                            })]
                          })]
                        }), (0, b.jsxs)("div",  {
                          style: {
                            display:"flex", flexDirection:"column", alignItems:"center", gap:"0.35rem"
                          }, children:[(0, b.jsx)("span",  {
                            style: {
                              fontSize:"0.7rem", color:"var(--foreground-muted)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em"
                            }, children:"Longest"
                          }), (0, b.jsxs)("div",  {
                            style: {
                              display:"flex", alignItems:"center", gap:"0.5rem", marginTop:"0.2rem"
                            }, children:[(0, b.jsx)("span",  {
                              style: {
                                fontSize:"1.2rem", fontWeight:800, color:"#fff", minWidth:"24px", textAlign:"center"
                              }, children:d.longestStreak
                            }), (0, b.jsxs)("div",  {
                              style: {
                                display:"flex", gap:"0.25rem"
                              }, children:[(0, b.jsx)("button",  {
                                type:"button", onClick:()=>aH(a.id, "longestStreak", -1), style: {
                                  width:"32px", height:"32px", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.05)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontWeight:"bold", fontSize:"1rem", transition:"background 0.2s"
                                }, onMouseEnter:a=>a.currentTarget.style.background="rgba(255,255,255,0.1)", onMouseLeave:a=>a.currentTarget.style.background="rgba(255,255,255,0.05)", children:"-"
                              }), (0, b.jsx)("button",  {
                                type:"button", onClick:()=>aH(a.id, "longestStreak", 1), style: {
                                  width:"32px", height:"32px", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.05)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontWeight:"bold", fontSize:"1rem", transition:"background 0.2s"
                                }, onMouseEnter:a=>a.currentTarget.style.background="rgba(255,255,255,0.1)", onMouseLeave:a=>a.currentTarget.style.background="rgba(255,255,255,0.05)", children:"+"
                              })]
                            })]
                          })]
                        }), (0, b.jsxs)("div",  {
                          style: {
                            display:"flex", flexDirection:"column", alignItems:"center", gap:"0.35rem"
                          }, children:[(0, b.jsx)("span",  {
                            style: {
                              fontSize:"0.7rem", color:"var(--foreground-muted)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em"
                            }, children:"Freezes"
                          }), (0, b.jsxs)("div",  {
                            style: {
                              display:"flex", alignItems:"center", gap:"0.75rem", marginTop:"0.2rem"
                            }, children:[(0, b.jsx)("span",  {
                              style: {
                                fontSize:"1.25rem", fontWeight:800, color:"#38bdf8", minWidth:"30px", textAlign:"center"
                              }, children:d.freezes
                            }), (0, b.jsxs)("div",  {
                              style: {
                                display:"flex", gap:"0.4rem"
                              }, children:[(0, b.jsx)("button",  {
                                type:"button", onClick:()=>aH(a.id, "freezes", -1), style: {
                                  width:"34px", height:"34px", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.05)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontWeight:"bold", fontSize:"1.1rem", transition:"background 0.2s"
                                }, onMouseEnter:a=>a.currentTarget.style.background="rgba(255,255,255,0.1)", onMouseLeave:a=>a.currentTarget.style.background="rgba(255,255,255,0.05)", children:"-"
                              }), (0, b.jsx)("button",  {
                                type:"button", onClick:()=>aH(a.id, "freezes", 1), style: {
                                  width:"34px", height:"34px", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.05)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontWeight:"bold", fontSize:"1.1rem", transition:"background 0.2s"
                                }, onMouseEnter:a=>a.currentTarget.style.background="rgba(255,255,255,0.1)", onMouseLeave:a=>a.currentTarget.style.background="rgba(255,255,255,0.05)", children:"+"
                              })]
                            })]
                          })]
                        }), (0, b.jsxs)("div",  {
                          style: {
                            display:"flex", flexDirection:"column", alignItems:"center", gap:"0.35rem"
                          }, children:[(0, b.jsx)("span",  {
                            style: {
                              fontSize:"0.7rem", color:"var(--foreground-muted)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em"
                            }, children:"Points"
                          }), (0, b.jsxs)("div",  {
                            style: {
                              display:"flex", alignItems:"center", gap:"0.75rem", marginTop:"0.2rem"
                            }, children:[(0, b.jsx)("span",  {
                              style: {
                                fontSize:"1.25rem", fontWeight:800, color:"var(--success)", minWidth:"30px", textAlign:"center"
                              }, children:d.points
                            }), (0, b.jsxs)("div",  {
                              style: {
                                display:"flex", gap:"0.4rem"
                              }, children:[(0, b.jsx)("button",  {
                                type:"button", onClick:()=>aH(a.id, "points", -1), style: {
                                  width:"34px", height:"34px", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.05)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontWeight:"bold", fontSize:"1.1rem", transition:"background 0.2s"
                                }, onMouseEnter:a=>a.currentTarget.style.background="rgba(255,255,255,0.1)", onMouseLeave:a=>a.currentTarget.style.background="rgba(255,255,255,0.05)", title:"-1 point", children:"-"
                              }), (0, b.jsx)("button",  {
                                type:"button", onClick:()=>aH(a.id, "points", 1), style: {
                                  width:"34px", height:"34px", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.05)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontWeight:"bold", fontSize:"1.1rem", transition:"background 0.2s"
                                }, onMouseEnter:a=>a.currentTarget.style.background="rgba(255,255,255,0.1)", onMouseLeave:a=>a.currentTarget.style.background="rgba(255,255,255,0.05)", title:"+1 point", children:"+"
                              })]
                            })]
                          })]
                        })]
                      }), e&&(0, b.jsxs)("div",  {
                        style: {
                          display:"flex", flexDirection:"column", alignItems:"center", gap:"0.5rem", marginTop:"0.5rem"
                        }, children:[(0, b.jsx)("span",  {
                          style: {
                            fontSize:"0.75rem", color:"#f59e0b", fontWeight:600, display:"flex", alignItems:"center", gap:"4px"
                          }, children:"⚠️ Unsaved Changes"
                        }), (0, b.jsxs)("div",  {
                          style: {
                            display:"flex", gap:"0.5rem", width:"100%"
                          }, children:[(0, b.jsx)("button",  {
                            onClick:()=>aJ(a.id), disabled:t===a.id, style: {
                              flex:1, padding:"0.55rem 1rem", background:"linear-gradient(135deg, var(--success) 0%, #047857 100%)", border:"none", borderRadius:"8px", color:"#fff", fontWeight:700, fontSize:"0.8rem", cursor:"pointer", boxShadow:"0 4px 10px rgba(16, 185, 129, 0.15)", transition:"opacity 0.2s"
                            }, onMouseEnter:a=>a.currentTarget.style.opacity="0.9", onMouseLeave:a=>a.currentTarget.style.opacity="1", children:t===a.id?"Saving...":"Save Changes"
                          }), (0, b.jsx)("button",  {
                            onClick:()=>aI(a.id), disabled:t===a.id, style: {
                              padding:"0.55rem 0.8rem", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"8px", color:"var(--foreground-muted)", fontSize:"0.8rem", cursor:"pointer"
                            }, children:"Discard"
                          })]
                        })]
                      })]
                    }), v===a.id&&(0, b.jsxs)("div",  {
                      className:"animate-fade-in", style: {
                        background:"rgba(239, 68, 68, 0.05)", border:"1px solid rgba(239, 68, 68, 0.2)", borderRadius:"8px", padding:"0.75rem 1rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"0.75rem", marginTop:"0.25rem"
                      }, children:[(0, b.jsxs)("span",  {
                        style: {
                          fontSize:"0.8rem", color:"var(--danger)", fontWeight:600
                        }, children:["⚠️ Reset ALL activity data for ", a.name, "?"]
                      }), (0, b.jsxs)("div",  {
                        style: {
                          display:"flex", gap:"0.5rem"
                        }, children:[(0, b.jsx)("button",  {
                          onClick:()=>aE(a.id), style: {
                            padding:"4px 12px", background:"linear-gradient(135deg, #ef4444, #dc2626)", border:"none", borderRadius:"6px", color:"#fff", fontSize:"0.75rem", fontWeight:600, cursor:"pointer"
                          }, children:"Confirm Reset"
                        }), (0, b.jsx)("button",  {
                          onClick:()=>w(null), className:"btn-secondary", style: {
                            padding:"4px 12px", fontSize:"0.75rem"
                          }, children:"Cancel"
                        })]
                      })]
                    }), z===a.id&&(0, b.jsxs)("div",  {
                      className:"animate-fade-in", style: {
                        background:"rgba(14, 165, 233, 0.04)", border:"1px solid rgba(14, 165, 233, 0.15)", borderRadius:"8px", padding:"0.75rem 1rem", display:"flex", gap:"0.5rem", alignItems:"center", marginTop:"0.25rem"
                      }, children:[(0, b.jsx)("svg",  {
                        width:"16", height:"16", fill:"none", stroke:"var(--primary)", strokeWidth:"2", viewBox:"0 0 24 24", style: {
                          flexShrink:0
                        }, children:(0, b.jsx)("path",  {
                          strokeLinecap:"round", strokeLinejoin:"round", d:"M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                        })
                      }), (0, b.jsx)("input",  {
                        type:"text", className:"input-field", placeholder:`Message to $ {
                          a.name
                        }...`, value:B, onChange:a=>C(a.target.value), maxLength:200, style: {
                          fontSize:"0.8rem", padding:"0.5rem 0.75rem"
                        }, onKeyDown:a=> {
                          "Enter"===a.key&&aG()
                        }
                      }), (0, b.jsx)("button",  {
                        onClick:aG, disabled:D||!B.trim(), className:"btn-primary", style: {
                          padding:"0.45rem 0.8rem", fontSize:"0.75rem", whiteSpace:"nowrap", opacity:B.trim()?1:.5
                        }, children:D?"Sending...":"Send"
                      })]
                    })]
                  })
                }, a.id)
              })
            })]
          }), (0, b.jsxs)("div",  {
            className:"glass-panel", style: {
              display:"flex", flexDirection:"column", gap:"1rem"
            }, children:[(0, b.jsx)("h2",  {
              style: {
                fontSize:"1.2rem", fontWeight:700, margin:0, color:"var(--foreground)"
              }, children:"Global Points Configuration ⚙️"
            }), (0, b.jsx)("p",  {
              style: {
                fontSize:"0.8rem", color:"var(--foreground-muted)", margin:0
              }, children:"Adjust the multiplier determining how many points are awarded per study problem logged."
            }), (0, b.jsxs)("div",  {
              style: {
                display:"flex", gap:"1rem", alignItems:"center"
              }, children:[(0, b.jsxs)("div",  {
                style: {
                  display:"flex", flexDirection:"column", gap:"0.25rem", flexGrow:1
                }, children:[(0, b.jsx)("label",  {
                  style: {
                    fontSize:"0.75rem", fontWeight:600, color:"var(--primary)"
                  }, children:"Points Per Problem Count"
                }), (0, b.jsx)("input",  {
                  type:"number", min:"1", max:"100", className:"input-field", value:U, onChange:a=>V(parseInt(a.target.value)||10), style: {
                    padding:"0.5rem 0.75rem", fontSize:"0.85rem"
                  }
                })]
              }), (0, b.jsx)("button",  {
                type:"button", onClick:aK, className:"btn-primary", style: {
                  padding:"0.6rem 1.25rem", fontSize:"0.85rem", alignSelf:"flex-end"
                }, children:"Save Setting"
              })]
            })]
          }), (0, b.jsxs)("div",  {
            className:"glass-panel", style: {
              display:"flex", flexDirection:"column", gap:"1.25rem"
            }, children:[(0, b.jsxs)("div",  {
              children:[(0, b.jsx)("h2",  {
                style: {
                  fontSize:"1.2rem", fontWeight:700, margin:0, color:"var(--foreground)"
                }, children:"Quiz & Challenge Builder 🧠"
              }), (0, b.jsx)("p",  {
                style: {
                  fontSize:"0.8rem", color:"var(--foreground-muted)", marginTop:"0.25rem"
                }, children:ao?"Edit quiz question options and correct answer.":"Create multiple choice quiz challenges with automated rewards."
              })]
            }), (0, b.jsxs)("form",  {
              onSubmit:aL, style: {
                display:"flex", flexDirection:"column", gap:"1rem"
              }, children:[(0, b.jsxs)("div",  {
                style: {
                  display:"flex", flexDirection:"column", gap:"0.25rem"
                }, children:[(0, b.jsx)("label",  {
                  style: {
                    fontSize:"0.75rem", fontWeight:600, color:"var(--primary)"
                  }, children:"Question Title"
                }), (0, b.jsx)("input",  {
                  type:"text", className:"input-field", placeholder:"e.g. Dynamic Programming basics", value:Y, onChange:a=>Z(a.target.value), required:!0, style: {
                    padding:"0.5rem 0.75rem", fontSize:"0.8rem"
                  }
                })]
              }), (0, b.jsxs)("div",  {
                style: {
                  display:"flex", flexDirection:"column", gap:"0.25rem"
                }, children:[(0, b.jsx)("label",  {
                  style: {
                    fontSize:"0.75rem", fontWeight:600, color:"var(--primary)"
                  }, children:"Description / Code Snippet"
                }), (0, b.jsx)("textarea",  {
                  className:"input-field", placeholder:"e.g. What is the time complexity of the fibonacci memoized lookup?", value:$, onChange:a=>_(a.target.value), style: {
                    minHeight:"60px", padding:"0.5rem 0.75rem", fontSize:"0.8rem", resize:"vertical"
                  }
                })]
              }), (0, b.jsxs)("div",  {
                style: {
                  display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem"
                }, children:[(0, b.jsxs)("div",  {
                  style: {
                    display:"flex", flexDirection:"column", gap:"0.25rem"
                  }, children:[(0, b.jsx)("label",  {
                    style: {
                      fontSize:"0.75rem", fontWeight:600, color:"var(--foreground-muted)"
                    }, children:"Option A"
                  }), (0, b.jsx)("input",  {
                    type:"text", className:"input-field", value:aa, onChange:a=>ab(a.target.value), required:!0, style: {
                      padding:"0.4rem 0.6rem", fontSize:"0.8rem"
                    }
                  })]
                }), (0, b.jsxs)("div",  {
                  style: {
                    display:"flex", flexDirection:"column", gap:"0.25rem"
                  }, children:[(0, b.jsx)("label",  {
                    style: {
                      fontSize:"0.75rem", fontWeight:600, color:"var(--foreground-muted)"
                    }, children:"Option B"
                  }), (0, b.jsx)("input",  {
                    type:"text", className:"input-field", value:ac, onChange:a=>ad(a.target.value), required:!0, style: {
                      padding:"0.4rem 0.6rem", fontSize:"0.8rem"
                    }
                  })]
                }), (0, b.jsxs)("div",  {
                  style: {
                    display:"flex", flexDirection:"column", gap:"0.25rem"
                  }, children:[(0, b.jsx)("label",  {
                    style: {
                      fontSize:"0.75rem", fontWeight:600, color:"var(--foreground-muted)"
                    }, children:"Option C"
                  }), (0, b.jsx)("input",  {
                    type:"text", className:"input-field", value:ae, onChange:a=>af(a.target.value), required:!0, style: {
                      padding:"0.4rem 0.6rem", fontSize:"0.8rem"
                    }
                  })]
                }), (0, b.jsxs)("div",  {
                  style: {
                    display:"flex", flexDirection:"column", gap:"0.25rem"
                  }, children:[(0, b.jsx)("label",  {
                    style: {
                      fontSize:"0.75rem", fontWeight:600, color:"var(--foreground-muted)"
                    }, children:"Option D"
                  }), (0, b.jsx)("input",  {
                    type:"text", className:"input-field", value:ag, onChange:a=>ah(a.target.value), required:!0, style: {
                      padding:"0.4rem 0.6rem", fontSize:"0.8rem"
                    }
                  })]
                })]
              }), (0, b.jsxs)("div",  {
                style: {
                  display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"0.75rem"
                }, children:[(0, b.jsxs)("div",  {
                  style: {
                    display:"flex", flexDirection:"column", gap:"0.25rem"
                  }, children:[(0, b.jsx)("label",  {
                    style: {
                      fontSize:"0.75rem", fontWeight:600, color:"var(--primary)"
                    }, children:"Correct Option"
                  }), (0, b.jsxs)("select",  {
                    className:"input-field", value:ai, onChange:a=>aj(a.target.value), style: {
                      padding:"0.4rem", fontSize:"0.8rem", background:"#0f172a", color:"#fff"
                    }, children:[(0, b.jsx)("option",  {
                      value:"A", children:"Option A"
                    }), (0, b.jsx)("option",  {
                      value:"B", children:"Option B"
                    }), (0, b.jsx)("option",  {
                      value:"C", children:"Option C"
                    }), (0, b.jsx)("option",  {
                      value:"D", children:"Option D"
                    })]
                  })]
                }), (0, b.jsxs)("div",  {
                  style: {
                    display:"flex", flexDirection:"column", gap:"0.25rem"
                  }, children:[(0, b.jsx)("label",  {
                    style: {
                      fontSize:"0.75rem", fontWeight:600, color:"var(--primary)"
                    }, children:"Reward Type"
                  }), (0, b.jsxs)("select",  {
                    className:"input-field", value:ak, onChange:a=>al(a.target.value), style: {
                      padding:"0.4rem", fontSize:"0.8rem", background:"#0f172a", color:"#fff"
                    }, children:[(0, b.jsx)("option",  {
                      value:"points", children:"Points ⭐"
                    }), (0, b.jsx)("option",  {
                      value:"freeze", children:"Streak Freeze ❄️"
                    })]
                  })]
                }), (0, b.jsxs)("div",  {
                  style: {
                    display:"flex", flexDirection:"column", gap:"0.25rem"
                  }, children:[(0, b.jsx)("label",  {
                    style: {
                      fontSize:"0.75rem", fontWeight:600, color:"var(--primary)"
                    }, children:"Reward Amount"
                  }), (0, b.jsx)("input",  {
                    type:"number", min:"1", max:"1000", className:"input-field", value:am, onChange:a=>an(parseInt(a.target.value)||50), required:!0, style: {
                      padding:"0.4rem 0.6rem", fontSize:"0.8rem"
                    }
                  })]
                })]
              }), (0, b.jsxs)("div",  {
                style: {
                  display:"flex", gap:"0.5rem", marginTop:"0.5rem"
                }, children:[(0, b.jsx)("button",  {
                  type:"submit", className:"btn-primary", style: {
                    flexGrow:1, padding:"0.6rem", fontSize:"0.85rem"
                  }, children:ao?"Update Challenge":"Publish Challenge"
                }), ao&&(0, b.jsx)("button",  {
                  type:"button", onClick:()=> {
                    ap(null), Z(""), _(""), ab(""), ad(""), af(""), ah(""), aj("A"), al("points"), an(50)
                  }, className:"btn-secondary", style: {
                    padding:"0.6rem", fontSize:"0.85rem"
                  }, children:"Cancel"
                })]
              }), as&&(0, b.jsx)("div",  {
                style: {
                  fontSize:"0.75rem", color:"var(--success)", textAlign:"center", background:"rgba(16, 185, 129, 0.06)", padding:"4px", borderRadius:"4px"
                }, children:as
              }), aq&&(0, b.jsx)("div",  {
                style: {
                  fontSize:"0.75rem", color:"var(--danger)", textAlign:"center", background:"rgba(239, 68, 68, 0.06)", padding:"4px", borderRadius:"4px"
                }, children:aq
              })]
            }), (0, b.jsxs)("div",  {
              style: {
                marginTop:"1rem", borderTop:"1px solid var(--glass-border)", paddingTop:"1rem"
              }, children:[(0, b.jsx)("h3",  {
                style: {
                  fontSize:"0.9rem", fontWeight:600, color:"#fff", marginBottom:"0.5rem"
                }, children:"Active Challenges (Last 24 Hours)"
              }), 0===(a=W.filter(a=>Date.now()<new Date(a.created_at).getTime()+864e5)).length?(0, b.jsx)("p",  {
                style: {
                  fontSize:"0.75rem", color:"var(--foreground-dark)", marginBottom:"1rem"
                }, children:"No active challenges."
              }):(0, b.jsx)("div",  {
                style: {
                  display:"flex", flexDirection:"column", gap:"0.5rem", maxHeight:"150px", overflowY:"auto", paddingRight:"4px", marginBottom:"1rem"
                }, children:a.map(a=>(0, b.jsxs)("div",  {
                  style: {
                    display:"flex", justifyContent:"space-between", alignItems:"center", background:aw===a.id?"rgba(14, 165, 233, 0.12)":"rgba(14, 165, 233, 0.04)", padding:"0.5rem 0.75rem", borderRadius:"6px", border:aw===a.id?"1px solid var(--primary)":"1px solid rgba(14, 165, 233, 0.15)"
                  }, children:[(0, b.jsxs)("div",  {
                    style: {
                      display:"flex", flexDirection:"column", gap:"2px", minWidth:0, paddingRight:"1rem"
                    }, children:[(0, b.jsx)("span",  {
                      style: {
                        fontSize:"0.8rem", fontWeight:600, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"
                      }, children:a.title
                    }), (0, b.jsxs)("span",  {
                      style: {
                        fontSize:"0.7rem", color:"var(--foreground-muted)"
                      }, children:["Reward: ", a.reward_amount, " ", a.reward_type, " (Ans: ", a.correct_option, ")"]
                    })]
                  }), (0, b.jsxs)("div",  {
                    style: {
                      display:"flex", gap:"8px"
                    }, children:[(0, b.jsx)("button",  {
                      type:"button", onClick:()=>aM(a), style: {
                        background:"none", border:"none", cursor:"pointer", fontSize:"0.8rem"
                      }, title:"Edit question", children:"✏️"
                    }), (0, b.jsx)("button",  {
                      type:"button", onClick:()=>aN(a.id), style: {
                        background:"none", border:"none", cursor:"pointer", fontSize:"0.8rem"
                      }, title:"Delete question", children:"🗑️"
                    }), (0, b.jsx)("button",  {
                      type:"button", onClick:()=>ax(a.id), style: {
                        background:"none", border:"none", cursor:"pointer", fontSize:"0.8rem"
                      }, title:"View Analytics", children:"📊"
                    })]
                  })]
                }, a.id))
              })]
            }), (0, b.jsxs)("div",  {
              style: {
                marginTop:"0.75rem", borderTop:"1px dashed var(--glass-border)", paddingTop:"0.75rem"
              }, children:[(0, b.jsx)("h3",  {
                style: {
                  fontSize:"0.9rem", fontWeight:600, color:"var(--foreground-muted)", marginBottom:"0.5rem"
                }, children:"Quiz History (Expired Quizzes)"
              }), 0===(f=W.filter(a=>Date.now()>=new Date(a.created_at).getTime()+864e5)).length?(0, b.jsx)("p",  {
                style: {
                  fontSize:"0.75rem", color:"var(--foreground-dark)"
                }, children:"No expired quizzes in history."
              }):(0, b.jsx)("div",  {
                style: {
                  display:"flex", flexDirection:"column", gap:"0.5rem", maxHeight:"150px", overflowY:"auto", paddingRight:"4px"
                }, children:f.map(a=>(0, b.jsxs)("div",  {
                  style: {
                    display:"flex", justifyContent:"space-between", alignItems:"center", background:aw===a.id?"rgba(14, 165, 233, 0.08)":"rgba(255,255,255,0.01)", padding:"0.5rem 0.75rem", borderRadius:"6px", border:aw===a.id?"1px solid var(--primary)":"1px solid rgba(255,255,255,0.03)"
                  }, children:[(0, b.jsxs)("div",  {
                    style: {
                      display:"flex", flexDirection:"column", gap:"2px", minWidth:0, paddingRight:"1rem"
                    }, children:[(0, b.jsx)("span",  {
                      style: {
                        fontSize:"0.8rem", fontWeight:600, color:"var(--foreground-muted)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"
                      }, children:a.title
                    }), (0, b.jsxs)("span",  {
                      style: {
                        fontSize:"0.7rem", color:"var(--foreground-dark)"
                      }, children:["Expired 24h+ ago (Ans: ", a.correct_option, ")"]
                    })]
                  }), (0, b.jsxs)("div",  {
                    style: {
                      display:"flex", gap:"8px"
                    }, children:[(0, b.jsx)("button",  {
                      type:"button", onClick:()=>aN(a.id), style: {
                        background:"none", border:"none", cursor:"pointer", fontSize:"0.8rem"
                      }, title:"Delete question", children:"🗑️"
                    }), (0, b.jsx)("button",  {
                      type:"button", onClick:()=>ax(a.id), style: {
                        background:"none", border:"none", cursor:"pointer", fontSize:"0.8rem"
                      }, title:"View Analytics", children:"📊"
                    })]
                  })]
                }, a.id))
              })]
            })]
          })]
        }), (0, b.jsxs)("section",  {
          style: {
            display:"flex", flexDirection:"column", gap:"1.5rem", minWidth:0
          }, children:[(0, b.jsxs)("div",  {
            className:"glass-panel", style: {
              height:"100%", display:"flex", flexDirection:"column"
            }, children:[(0, b.jsx)("h2",  {
              style: {
                fontSize:"1.2rem", fontWeight:700, marginBottom:"0.5rem", color:"var(--foreground)"
              }, children:"Work Submission Screen Feeds"
            }), (0, b.jsx)("p",  {
              style: {
                fontSize:"0.8rem", color:"var(--foreground-muted)", marginBottom:"1.5rem"
              }, children:"JPG uploads from trainees showing evidence of daily task accomplishments."
            }), (0, b.jsx)("div",  {
              style: {
                display:"flex", flexDirection:"column", gap:"1.25rem", overflowY:"auto", flexGrow:1, maxHeight:"600px", paddingRight:"4px"
              }, children:0===n.length?(0, b.jsx)("div",  {
                style: {
                  textAlign:"center", padding:"5rem 0", color:"var(--foreground-dark)", flexGrow:1
                }, className:"flex-center", children:"No JPG work uploads found."
              }):n.map(a=>(0, b.jsxs)("div",  {
                className:"glass-panel", style: {
                  background:"rgba(255,255,255,0.01)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:"12px", padding:"1rem", display:"flex", flexDirection:"column", gap:"0.75rem"
                }, children:[(0, b.jsxs)("div",  {
                  style: {
                    display:"flex", justifyContent:"space-between", alignItems:"center"
                  }, children:[(0, b.jsxs)("div",  {
                    style: {
                      display:"flex", alignItems:"center", gap:"0.5rem"
                    }, children:[(0, b.jsx)("img",  {
                      src:a.avatarUrl||"", alt:a.userName, style: {
                        width:"28px", height:"28px", borderRadius:"50%", objectFit:"cover"
                      }
                    }), (0, b.jsxs)("div",  {
                      children:[(0, b.jsx)("div",  {
                        style: {
                          fontWeight:600, fontSize:"0.85rem"
                        }, children:a.userName
                      }), (0, b.jsx)("div",  {
                        style: {
                          fontSize:"0.7rem", color:"var(--foreground-muted)"
                        }, children:new Date(a.date).toLocaleDateString(void 0,  {
                          weekday:"short", month:"short", day:"numeric"
                        })
                      })]
                    })]
                  }), (0, b.jsx)("span",  {
                    style: {
                      fontSize:"0.75rem", padding:"2px 8px", borderRadius:"4px", background:"rgba(14, 165, 233, 0.12)", border:"1px solid rgba(14, 165, 233, 0.2)", color:"var(--primary)", fontWeight:600
                    }, children:a.category
                  })]
                }), a.notes&&(0, b.jsx)("p",  {
                  style: {
                    fontSize:"0.8rem", color:"var(--foreground-muted)", background:"rgba(0,0,0,0.1)", padding:"0.5rem 0.75rem", borderRadius:"6px"
                  }, children:a.notes
                }), a.image_url&&(0, b.jsxs)("div",  {
                  onClick:()=>s(a.image_url), style: {
                    position:"relative", width:"100%", height:"150px", borderRadius:"8px", overflow:"hidden", border:"1px solid rgba(255,255,255,0.08)", cursor:"pointer", transition:"var(--transition-smooth)"
                  }, onMouseEnter:a=>a.currentTarget.style.borderColor="var(--primary)", onMouseLeave:a=>a.currentTarget.style.borderColor="rgba(255,255,255,0.08)", children:[(0, b.jsx)("img",  {
                    src:a.image_url, alt:"Work screenshot", loading:"lazy", style: {
                      width:"100%", height:"100%", objectFit:"cover"
                    }
                  }), (0, b.jsx)("div",  {
                    style: {
                      position:"absolute", bottom:0, left:0, right:0, background:"linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)", padding:"0.5rem", textAlign:"center", color:"#fff", fontSize:"0.75rem", fontWeight:500
                    }, children:"Click to View Full JPG Screen"
                  })]
                })]
              }, a.id))
            })]
          }), (0, b.jsxs)("div",  {
            className:"glass-panel", style: {
              display:"flex", flexDirection:"column", marginTop:"1.5rem", minHeight:"500px", maxHeight:"550px"
            }, children:[(0, b.jsx)("h2",  {
              style: {
                fontSize:"1.2rem", fontWeight:700, marginBottom:"0.25rem", color:"var(--foreground)"
              }, children:"Trainee Chat Center 💬"
            }), (0, b.jsx)("p",  {
              style: {
                fontSize:"0.8rem", color:"var(--foreground-muted)", marginBottom:"1rem"
              }, children:"Direct messaging and updates history with trainees."
            }), (0, b.jsxs)("div",  {
              style: {
                display:"grid", gridTemplateColumns:"240px 1fr", gap:0, border:"1px solid var(--glass-border)", borderRadius:"10px", overflow:"hidden", background:"rgba(0,0,0,0.2)", flexGrow:1, minHeight:"380px"
              }, children:[(0, b.jsxs)("div",  {
                style: {
                  borderRight:"1px solid var(--glass-border)", display:"flex", flexDirection:"column", background:"rgba(255,255,255,0.01)", height:"100%"
                }, children:[(0, b.jsx)("div",  {
                  style: {
                    padding:"0.5rem", borderBottom:"1px solid var(--glass-border)"
                  }, children:(0, b.jsx)("input",  {
                    type:"text", className:"input-field", placeholder:"Search trainees...", value:N, onChange:a=>O(a.target.value), style: {
                      fontSize:"0.75rem", padding:"0.4rem 0.6rem", width:"100%"
                    }
                  })
                }), (0, b.jsx)("div",  {
                  style: {
                    overflowY:"auto", flexGrow:1, maxHeight:"380px"
                  }, children:((h=(g=Array.from(new Set(J.map(a=>a.user_id))).map(a=> {
                    let b=J.filter(b=>b.user_id===a), c=l.find(b=>b.id===a), d=c?.name||b[0]?.user_name||"Unknown User", e=[...b].sort((a, b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime())[0], f=b.filter(a=>!a.is_read&&!a.from_admin).length;
                    return {
                      userId:a, userName:d, lastMessage:e?.message||"", lastMessageTime:e?new Date(e.created_at).getTime():0, unreadCount:f
                    }
                  })).filter(a=>a.userName.toLowerCase().includes(N.toLowerCase()))).sort((a, b)=>b.lastMessageTime-a.lastMessageTime), 0===g.length)?(0, b.jsx)("div",  {
                    style: {
                      textAlign:"center", padding:"2rem 0.5rem", color:"var(--foreground-dark)", fontSize:"0.75rem"
                    }, children:"No chat history."
                  }):0===h.length?(0, b.jsx)("div",  {
                    style: {
                      textAlign:"center", padding:"2rem 0.5rem", color:"var(--foreground-dark)", fontSize:"0.75rem"
                    }, children:"No users match."
                  }):h.map(a=> {
                    let c=L===a.userId;
                    return(0, b.jsxs)("button",  {
                      type:"button", onClick:()=>aB(a.userId), style: {
                        width:"100%", border:"none", borderBottom:"1px solid rgba(255,255,255,0.03)", padding:"0.75rem 0.6rem", display:"flex", flexDirection:"column", gap:"4px", textAlign:"left", background:c?"rgba(14, 165, 233, 0.12)":"transparent", cursor:"pointer", transition:"background 0.2s"
                      }, onMouseEnter:a=> {
                        c||(a.currentTarget.style.background="rgba(255,255,255,0.02)")
                      }, onMouseLeave:a=> {
                        c||(a.currentTarget.style.background="transparent")
                      }, children:[(0, b.jsxs)("div",  {
                        style: {
                          display:"flex", justifyContent:"space-between", width:"100%", alignItems:"center"
                        }, children:[(0, b.jsx)("span",  {
                          style: {
                            fontWeight:600, fontSize:"0.8rem", color:c?"var(--primary)":"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"120px"
                          }, children:a.userName
                        }), a.lastMessageTime>0&&(0, b.jsx)("span",  {
                          style: {
                            fontSize:"0.6rem", color:"var(--foreground-dark)"
                          }, children:new Date(a.lastMessageTime).toLocaleTimeString([],  {
                            hour:"2-digit", minute:"2-digit"
                          })
                        })]
                      }), (0, b.jsxs)("div",  {
                        style: {
                          display:"flex", justifyContent:"space-between", width:"100%", alignItems:"center", gap:"8px"
                        }, children:[(0, b.jsx)("span",  {
                          style: {
                            fontSize:"0.7rem", color:"var(--foreground-muted)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", flexGrow:1, textAlign:"left"
                          }, children:a.lastMessage
                        }), a.unreadCount>0&&(0, b.jsx)("span",  {
                          style: {
                            background:"var(--primary)", color:"#fff", fontSize:"0.6rem", fontWeight:700, borderRadius:"50%", minWidth:"15px", height:"15px", display:"flex", alignItems:"center", justifyContent:"center", padding:"2px"
                          }, children:a.unreadCount
                        })]
                      })]
                    }, a.userId)
                  })
                })]
              }), (0, b.jsx)("div",  {
                style: {
                  display:"flex", flexDirection:"column", background:"rgba(255,255,255,0.02)", height:"100%"
                }, children:(()=> {
                  if(!L)return(0, b.jsx)("div",  {
                    style: {
                      margin:"auto", textAlign:"center", color:"var(--foreground-dark)", fontSize:"0.8rem", padding:"2rem"
                    }, children:"Select a trainee from the left list to view active conversation and send replies."
                  });
                  let a=l.find(a=>a.id===L), d=a?.name||"Unknown Trainee", e=J.filter(a=>a.user_id===L).sort((a, b)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime());
                  return(0, b.jsxs)(c.default.Fragment,  {
                    children:[(0, b.jsxs)("div",  {
                      style: {
                        padding:"0.5rem 1rem", borderBottom:"1px solid var(--glass-border)", background:"rgba(0,0,0,0.1)", display:"flex", alignItems:"center", justifyContent:"space-between"
                      }, children:[(0, b.jsxs)("span",  {
                        style: {
                          fontWeight:700, fontSize:"0.85rem", color:"#fff"
                        }, children:["Chat: ", d]
                      }), (0, b.jsxs)("span",  {
                        style: {
                          fontSize:"0.65rem", color:"var(--foreground-muted)"
                        }, children:["ID: ", (0, b.jsx)("code",  {
                          style: {
                            fontSize:"0.6rem"
                          }, children:L
                        })]
                      })]
                    }), (0, b.jsxs)("div",  {
                      style: {
                        flexGrow:1, overflowY:"auto", padding:"1rem", display:"flex", flexDirection:"column", gap:"0.75rem", maxHeight:"350px"
                      }, children:[0===e.length?(0, b.jsx)("div",  {
                        style: {
                          margin:"auto", color:"var(--foreground-dark)", fontSize:"0.75rem"
                        }, children:"No messages exchanged yet."
                      }):e.map(a=> {
                        let c=!a.from_admin;
                        return(0, b.jsxs)("div",  {
                          style: {
                            display:"flex", flexDirection:"column", alignSelf:c?"flex-end":"flex-start", maxWidth:"75%", gap:"2px"
                          }, children:[(0, b.jsx)("div",  {
                            style: {
                              background:c?"rgba(14, 165, 233, 0.15)":"rgba(255, 255, 255, 0.05)", border:c?"1px solid rgba(14, 165, 233, 0.3)":"1px solid var(--glass-border)", padding:"0.5rem 0.75rem", borderRadius:c?"12px 12px 2px 12px":"12px 12px 12px 2px", color:"#fff", fontSize:"0.8rem", wordBreak:"break-word", whiteSpace:"pre-wrap", textAlign:"left"
                            }, children:a.message
                          }), (0, b.jsx)("div",  {
                            style: {
                              fontSize:"0.6rem", color:"var(--foreground-dark)", textAlign:c?"right":"left", padding:"0 4px"
                            }, children:new Date(a.created_at).toLocaleString(void 0,  {
                              hour:"2-digit", minute:"2-digit", month:"short", day:"numeric"
                            })
                          })]
                        }, a.id)
                      }), (0, b.jsx)("div",  {
                        ref:T
                      })]
                    }), (0, b.jsxs)("form",  {
                      onSubmit:aC, style: {
                        padding:"0.5rem 0.75rem", borderTop:"1px solid var(--glass-border)", background:"rgba(0,0,0,0.1)", display:"flex", gap:"0.5rem", alignItems:"center"
                      }, children:[(0, b.jsx)("input",  {
                        type:"text", className:"input-field", placeholder:`Reply to $ {
                          d
                        }...`, value:P, onChange:a=>Q(a.target.value), maxLength:300, required:!0, style: {
                          fontSize:"0.8rem", padding:"0.5rem 0.75rem", flexGrow:1
                        }
                      }), (0, b.jsx)("button",  {
                        type:"submit", disabled:R||!P.trim(), className:"btn-primary", style: {
                          padding:"0.5rem 1rem", fontSize:"0.75rem", whiteSpace:"nowrap", opacity:P.trim()?1:.5
                        }, children:R?"Sending...":"Send"
                      })]
                    })]
                  })
                })()
              })]
            })]
          }), (0, b.jsxs)("div",  {
            className:"glass-panel", style: {
              display:"flex", flexDirection:"column", marginTop:"1.5rem", gap:"1rem"
            }, children:[(0, b.jsxs)("div",  {
              children:[(0, b.jsx)("h2",  {
                style: {
                  fontSize:"1.2rem", fontWeight:700, margin:0, color:"var(--foreground)"
                }, children:"Quiz Analytics & Submissions 📊"
              }), (0, b.jsx)("p",  {
                style: {
                  fontSize:"0.8rem", color:"var(--foreground-muted)", marginTop:"0.25rem"
                }, children:"Select a quiz challenge from the left builder panel to analyze trainee responses and performance."
              })]
            }), (()=> {
              let a=W.find(a=>a.id===aw);
              if(!a)return(0, b.jsx)("div",  {
                style: {
                  textAlign:"center", padding:"2rem 0", color:"var(--foreground-dark)"
                }, children:"No quiz selected or available. Click the 📊 icon on any quiz in the builder panel."
              });
              let c=au.filter(a=>a.quiz_id===aw), d=c.length, e=c.filter(a=>a.is_correct).length, f=d-e, g=d>0?Math.round(e/d*100):0, h=d>0?Math.round(f/d*100):0, i=c.filter(a=>"A"===a.selected_option).length, j=c.filter(a=>"B"===a.selected_option).length, k=c.filter(a=>"C"===a.selected_option).length, l=c.filter(a=>"D"===a.selected_option).length, m=d>0?Math.round(i/d*100):0, n=d>0?Math.round(j/d*100):0, o=d>0?Math.round(k/d*100):0, p=d>0?Math.round(l/d*100):0;
              return(0, b.jsxs)("div",  {
                style: {
                  display:"flex", flexDirection:"column", gap:"1.5rem"
                }, children:[(0, b.jsxs)("div",  {
                  style: {
                    padding:"0.75rem 1rem", background:"rgba(255, 255, 255, 0.02)", border:"1px solid var(--glass-border)", borderRadius:"8px"
                  }, children:[(0, b.jsx)("h3",  {
                    style: {
                      fontSize:"1rem", fontWeight:700, color:"var(--primary)", margin:0
                    }, children:a.title
                  }), a.description&&(0, b.jsx)("p",  {
                    style: {
                      fontSize:"0.8rem", color:"var(--foreground-muted)", margin:"0.25rem 0 0 0", whiteSpace:"pre-wrap"
                    }, children:a.description
                  }), (0, b.jsxs)("div",  {
                    style: {
                      display:"flex", gap:"1rem", marginTop:"0.5rem", fontSize:"0.75rem", color:"var(--foreground-dark)"
                    }, children:[(0, b.jsxs)("span",  {
                      children:["Correct Answer: ", (0, b.jsxs)("strong",  {
                        style: {
                          color:"var(--success)"
                        }, children:["Option ", a.correct_option]
                      })]
                    }), (0, b.jsx)("span",  {
                      children:"•"
                    }), (0, b.jsxs)("span",  {
                      children:["Reward: ", a.reward_amount, " ", "points"===a.reward_type?"Points ⭐":"Freezes ❄️"]
                    })]
                  })]
                }), (0, b.jsxs)("div",  {
                  style: {
                    display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.5rem"
                  }, children:[(0, b.jsxs)("div",  {
                    style: {
                      border:"1px solid var(--glass-border)", borderRadius:"10px", padding:"1rem", background:"rgba(0,0,0,0.1)", display:"flex", flexDirection:"column", alignItems:"center", gap:"0.75rem"
                    }, children:[(0, b.jsx)("h4",  {
                      style: {
                        fontSize:"0.85rem", fontWeight:600, color:"#fff", margin:0
                      }, children:"Correct vs Incorrect"
                    }), (0, b.jsx)("div",  {
                      style: {
                        position:"relative", width:"120px", height:"120px", borderRadius:"50%", background:d>0?`conic-gradient(var(--success) 0% $ {
                          g
                        }%,  var(--danger) $ {
                          g
                        }% 100%)`:"#334155", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 10px rgba(0,0,0,0.3)"
                      }, children:(0, b.jsxs)("div",  {
                        style: {
                          position:"absolute", width:"80px", height:"80px", borderRadius:"50%", background:"#0b0f19", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center"
                        }, children:[(0, b.jsx)("span",  {
                          style: {
                            fontSize:"0.95rem", fontWeight:800, color:"#fff"
                          }, children:d
                        }), (0, b.jsx)("span",  {
                          style: {
                            fontSize:"0.6rem", color:"var(--foreground-muted)", textTransform:"uppercase"
                          }, children:"Answers"
                        })]
                      })
                    }), (0, b.jsxs)("div",  {
                      style: {
                        display:"flex", flexDirection:"column", gap:"0.25rem", fontSize:"0.75rem", width:"100%", marginTop:"0.25rem"
                      }, children:[(0, b.jsxs)("div",  {
                        style: {
                          display:"flex", justifyContent:"space-between", alignItems:"center"
                        }, children:[(0, b.jsxs)("div",  {
                          style: {
                            display:"flex", alignItems:"center", gap:"6px"
                          }, children:[(0, b.jsx)("span",  {
                            style: {
                              width:"8px", height:"8px", borderRadius:"50%", background:"var(--success)"
                            }
                          }), (0, b.jsx)("span",  {
                            style: {
                              color:"var(--foreground-muted)"
                            }, children:"Correct"
                          })]
                        }), (0, b.jsxs)("strong",  {
                          style: {
                            color:"var(--success)"
                          }, children:[g, "% (", e, ")"]
                        })]
                      }), (0, b.jsxs)("div",  {
                        style: {
                          display:"flex", justifyContent:"space-between", alignItems:"center"
                        }, children:[(0, b.jsxs)("div",  {
                          style: {
                            display:"flex", alignItems:"center", gap:"6px"
                          }, children:[(0, b.jsx)("span",  {
                            style: {
                              width:"8px", height:"8px", borderRadius:"50%", background:"var(--danger)"
                            }
                          }), (0, b.jsx)("span",  {
                            style: {
                              color:"var(--foreground-muted)"
                            }, children:"Incorrect"
                          })]
                        }), (0, b.jsxs)("strong",  {
                          style: {
                            color:"var(--danger)"
                          }, children:[h, "% (", f, ")"]
                        })]
                      })]
                    })]
                  }), (0, b.jsxs)("div",  {
                    style: {
                      border:"1px solid var(--glass-border)", borderRadius:"10px", padding:"1rem", background:"rgba(0,0,0,0.1)", display:"flex", flexDirection:"column", alignItems:"center", gap:"0.75rem"
                    }, children:[(0, b.jsx)("h4",  {
                      style: {
                        fontSize:"0.85rem", fontWeight:600, color:"#fff", margin:0
                      }, children:"Answer Distribution"
                    }), (0, b.jsx)("div",  {
                      style: {
                        position:"relative", width:"120px", height:"120px", borderRadius:"50%", background:d>0?`conic-gradient(#38bdf8 0% $ {
                          m
                        }%,  #a855f7 $ {
                          m
                        }% $ {
                          m+n
                        }%,  #f59e0b $ {
                          m+n
                        }% $ {
                          m+n+o
                        }%,  #ec4899 $ {
                          m+n+o
                        }% 100%)`:"#334155", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 10px rgba(0,0,0,0.3)"
                      }, children:(0, b.jsx)("div",  {
                        style: {
                          position:"absolute", width:"80px", height:"80px", borderRadius:"50%", background:"#0b0f19", display:"flex", alignItems:"center", justifyContent:"center"
                        }, children:(0, b.jsx)("span",  {
                          style: {
                            fontSize:"0.75rem", fontWeight:700, color:"var(--primary)"
                          }, children:"Options"
                        })
                      })
                    }), (0, b.jsxs)("div",  {
                      style: {
                        display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.4rem 0.75rem", fontSize:"0.7rem", width:"100%"
                      }, children:[(0, b.jsxs)("div",  {
                        style: {
                          display:"flex", justifyContent:"space-between", alignItems:"center"
                        }, children:[(0, b.jsxs)("div",  {
                          style: {
                            display:"flex", alignItems:"center", gap:"4px"
                          }, children:[(0, b.jsx)("span",  {
                            style: {
                              width:"8px", height:"8px", background:"#38bdf8", borderRadius:"2px"
                            }
                          }), (0, b.jsx)("span",  {
                            style: {
                              color:"var(--foreground-muted)"
                            }, children:"A"
                          })]
                        }), (0, b.jsxs)("span",  {
                          style: {
                            fontWeight:600, color:"#38bdf8"
                          }, children:[m, "% (", i, ")"]
                        })]
                      }), (0, b.jsxs)("div",  {
                        style: {
                          display:"flex", justifyContent:"space-between", alignItems:"center"
                        }, children:[(0, b.jsxs)("div",  {
                          style: {
                            display:"flex", alignItems:"center", gap:"4px"
                          }, children:[(0, b.jsx)("span",  {
                            style: {
                              width:"8px", height:"8px", background:"#a855f7", borderRadius:"2px"
                            }
                          }), (0, b.jsx)("span",  {
                            style: {
                              color:"var(--foreground-muted)"
                            }, children:"B"
                          })]
                        }), (0, b.jsxs)("span",  {
                          style: {
                            fontWeight:600, color:"#a855f7"
                          }, children:[n, "% (", j, ")"]
                        })]
                      }), (0, b.jsxs)("div",  {
                        style: {
                          display:"flex", justifyContent:"space-between", alignItems:"center"
                        }, children:[(0, b.jsxs)("div",  {
                          style: {
                            display:"flex", alignItems:"center", gap:"4px"
                          }, children:[(0, b.jsx)("span",  {
                            style: {
                              width:"8px", height:"8px", background:"#f59e0b", borderRadius:"2px"
                            }
                          }), (0, b.jsx)("span",  {
                            style: {
                              color:"var(--foreground-muted)"
                            }, children:"C"
                          })]
                        }), (0, b.jsxs)("span",  {
                          style: {
                            fontWeight:600, color:"#f59e0b"
                          }, children:[o, "% (", k, ")"]
                        })]
                      }), (0, b.jsxs)("div",  {
                        style: {
                          display:"flex", justifyContent:"space-between", alignItems:"center"
                        }, children:[(0, b.jsxs)("div",  {
                          style: {
                            display:"flex", alignItems:"center", gap:"4px"
                          }, children:[(0, b.jsx)("span",  {
                            style: {
                              width:"8px", height:"8px", background:"#ec4899", borderRadius:"2px"
                            }
                          }), (0, b.jsx)("span",  {
                            style: {
                              color:"var(--foreground-muted)"
                            }, children:"D"
                          })]
                        }), (0, b.jsxs)("span",  {
                          style: {
                            fontWeight:600, color:"#ec4899"
                          }, children:[p, "% (", l, ")"]
                        })]
                      })]
                    })]
                  })]
                }), (0, b.jsxs)("div",  {
                  style: {
                    borderTop:"1px solid var(--glass-border)", paddingTop:"1rem"
                  }, children:[(0, b.jsx)("h4",  {
                    style: {
                      fontSize:"0.9rem", fontWeight:600, color:"#fff", marginBottom:"0.5rem"
                    }, children:"Answer Details Log"
                  }), (0, b.jsx)("div",  {
                    style: {
                      overflowX:"auto", maxHeight:"250px", overflowY:"auto", border:"1px solid var(--glass-border)", borderRadius:"8px", background:"rgba(0,0,0,0.15)"
                    }, children:(0, b.jsxs)("table",  {
                      style: {
                        width:"100%", borderCollapse:"collapse", fontSize:"0.8rem", textAlign:"left"
                      }, children:[(0, b.jsx)("thead",  {
                        children:(0, b.jsxs)("tr",  {
                          style: {
                            borderBottom:"1px solid var(--glass-border)", color:"var(--foreground-muted)", background:"rgba(255,255,255,0.02)"
                          }, children:[(0, b.jsx)("th",  {
                            style: {
                              padding:"0.6rem 0.75rem", fontWeight:600
                            }, children:"Username"
                          }), (0, b.jsx)("th",  {
                            style: {
                              padding:"0.6rem 0.75rem", fontWeight:600, textAlign:"center"
                            }, children:"Selected"
                          }), (0, b.jsx)("th",  {
                            style: {
                              padding:"0.6rem 0.75rem", fontWeight:600, textAlign:"center"
                            }, children:"Correct Answer"
                          }), (0, b.jsx)("th",  {
                            style: {
                              padding:"0.6rem 0.75rem", fontWeight:600, textAlign:"center"
                            }, children:"Result"
                          }), (0, b.jsx)("th",  {
                            style: {
                              padding:"0.6rem 0.75rem", fontWeight:600, textAlign:"right"
                            }, children:"Submitted At"
                          })]
                        })
                      }), (0, b.jsx)("tbody",  {
                        children:0===c.length?(0, b.jsx)("tr",  {
                          children:(0, b.jsx)("td",  {
                            colSpan:5, style: {
                              padding:"2rem 1rem", textAlign:"center", color:"var(--foreground-dark)"
                            }, children:"No submissions recorded for this challenge yet."
                          })
                        }):[...c].sort((a, b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).map(c=>(0, b.jsxs)("tr",  {
                          style: {
                            borderBottom:"1px solid rgba(255,255,255,0.02)", transition:"background 0.2s"
                          }, onMouseEnter:a=>a.currentTarget.style.background="rgba(255,255,255,0.01)", onMouseLeave:a=>a.currentTarget.style.background="transparent", children:[(0, b.jsx)("td",  {
                            style: {
                              padding:"0.6rem 0.75rem", fontWeight:500, color:"#fff"
                            }, children:c.user_name
                          }), (0, b.jsxs)("td",  {
                            style: {
                              padding:"0.6rem 0.75rem", textAlign:"center", fontWeight:700, color:c.selected_option===a.correct_option?"var(--success)":"var(--danger)"
                            }, children:["Option ", c.selected_option]
                          }), (0, b.jsxs)("td",  {
                            style: {
                              padding:"0.6rem 0.75rem", textAlign:"center", fontWeight:700, color:"var(--success)"
                            }, children:["Option ", a.correct_option]
                          }), (0, b.jsx)("td",  {
                            style: {
                              padding:"0.6rem 0.75rem", textAlign:"center"
                            }, children:(0, b.jsx)("span",  {
                              style: {
                                fontSize:"0.7rem", fontWeight:700, padding:"2px 8px", borderRadius:"4px", background:c.is_correct?"rgba(16, 185, 129, 0.12)":"rgba(239, 68, 68, 0.12)", color:c.is_correct?"var(--success)":"var(--danger)", border:c.is_correct?"1px solid rgba(16, 185, 129, 0.2)":"1px solid rgba(239, 68, 68, 0.2)"
                              }, children:c.is_correct?"Correct":"Incorrect"
                            })
                          }), (0, b.jsx)("td",  {
                            style: {
                              padding:"0.6rem 0.75rem", textAlign:"right", color:"var(--foreground-muted)"
                            }, children:new Date(c.created_at).toLocaleString()
                          })]
                        }, c.id))
                      })]
                    })
                  })]
                })]
              })
            })()]
          })]
        })]
      }), r&&(0, b.jsxs)("div",  {
        onClick:()=>s(null), className:"flex-center animate-fade-in", style: {
          position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(5, 7, 13, 0.9)", zIndex:999, padding:"2rem", cursor:"pointer"
        }, children:[(0, b.jsx)("div",  {
          style: {
            position:"absolute", top:"1.5rem", right:"1.5rem", color:"#fff", fontSize:"1.5rem", fontWeight:600
          }, children:"✕ Close"
        }), (0, b.jsx)("div",  {
          style: {
            maxWidth:"90%", maxHeight:"85vh", borderRadius:"12px", overflow:"hidden", border:"1px solid rgba(255,255,255,0.1)"
          }, children:(0, b.jsx)("img",  {
            src:r, alt:"Screenshot Zoomed", style: {
              width:"100%", maxHeight:"85vh", objectFit:"contain", cursor:"default"
            }, onClick:a=>a.stopPropagation()
          })
        })]
      })]
    })
  }])
}];


//# sourceMappingURL=src_app_admin_page_tsx_0ublbd0._.js.map