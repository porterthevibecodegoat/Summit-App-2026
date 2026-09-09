import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  ImageBackground,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, typography } from "@not-alone/design-tokens";

const launchArt = require("../assets/launch-art-premium.png");

type SparkDefinition = {
  delay: number;
  driftX: number;
  rise: number;
  scale: number;
  x: `${number}%`;
  y: `${number}%`;
};

const sparks: SparkDefinition[] = [
  { x: "17%", y: "88%", delay: 300, driftX: -12, rise: -510, scale: 1 },
  { x: "31%", y: "84%", delay: 1450, driftX: 18, rise: -470, scale: 0.72 },
  { x: "77%", y: "86%", delay: 900, driftX: -20, rise: -490, scale: 1.15 },
  { x: "66%", y: "92%", delay: 2350, driftX: 12, rise: -540, scale: 0.88 },
  { x: "46%", y: "90%", delay: 1900, driftX: -16, rise: -500, scale: 0.78 },
  { x: "84%", y: "80%", delay: 3300, driftX: 14, rise: -465, scale: 0.82 },
  { x: "12%", y: "76%", delay: 3950, driftX: 22, rise: -430, scale: 0.7 },
  { x: "88%", y: "72%", delay: 4550, driftX: -24, rise: -420, scale: 0.66 },
  { x: "24%", y: "94%", delay: 5250, driftX: 10, rise: -550, scale: 0.9 },
  { x: "57%", y: "96%", delay: 6000, driftX: -10, rise: -570, scale: 1.05 },
  { x: "72%", y: "91%", delay: 6750, driftX: 26, rise: -520, scale: 0.74 },
  { x: "39%", y: "79%", delay: 7550, driftX: -22, rise: -445, scale: 0.68 }
];

let hasShownThisLaunch = false;

export function OpeningGreeting() {
  const [visible, setVisible] = useState(!hasShownThisLaunch);
  const [enterReady, setEnterReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const { height } = useWindowDimensions();
  const compact = height < 720;
  const entrance = useRef(new Animated.Value(0)).current;
  const titleEntrance = useRef(new Animated.Value(0)).current;
  const buttonEntrance = useRef(new Animated.Value(0)).current;
  const ambient = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;
  const sweep = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(1)).current;
  const sparkAnimations = useMemo(() => sparks.map(() => new Animated.Value(0)), []);

  useEffect(() => {
    if (!visible) {
      return;
    }

    hasShownThisLaunch = true;
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) {
        setReduceMotion(enabled);
      }
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    entrance.setValue(0);
    titleEntrance.setValue(0);
    buttonEntrance.setValue(0);
    exit.setValue(1);

    if (reduceMotion) {
      entrance.setValue(1);
      titleEntrance.setValue(1);
      buttonEntrance.setValue(1);
      ambient.setValue(0.5);
      halo.setValue(0);
      sweep.setValue(0);
      sparkAnimations.forEach((progress) => progress.setValue(0));
      setEnterReady(true);
      return;
    }

    const opening = Animated.parallel([
      Animated.timing(entrance, {
        duration: 1250,
        easing: Easing.bezier(0.2, 0.8, 0.18, 1),
        toValue: 1,
        useNativeDriver: true
      }),
      Animated.sequence([
        Animated.delay(620),
        Animated.timing(titleEntrance, {
          duration: 880,
          easing: Easing.bezier(0.18, 0.82, 0.22, 1),
          toValue: 1,
          useNativeDriver: true
        })
      ]),
      Animated.sequence([
        Animated.delay(1450),
        Animated.timing(buttonEntrance, {
          duration: 520,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true
        })
      ])
    ]);
    const ambientLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ambient, {
          duration: 2100,
          easing: Easing.inOut(Easing.sin),
          toValue: 1,
          useNativeDriver: true
        }),
        Animated.timing(ambient, {
          duration: 2100,
          easing: Easing.inOut(Easing.sin),
          toValue: 0,
          useNativeDriver: true
        })
      ])
    );
    const haloLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(halo, {
          duration: 1300,
          easing: Easing.out(Easing.quad),
          toValue: 1,
          useNativeDriver: true
        }),
        Animated.delay(1300),
        Animated.timing(halo, {
          duration: 0,
          toValue: 0,
          useNativeDriver: true
        })
      ])
    );
    const sweepLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(sweep, {
          duration: 1550,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: true
        }),
        Animated.timing(sweep, {
          duration: 0,
          toValue: 0,
          useNativeDriver: true
        }),
        Animated.delay(2750)
      ])
    );
    const sparkLoops = sparkAnimations.map((progress, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(sparks[index]?.delay ?? 0),
          Animated.timing(progress, {
            duration: 9800,
            easing: Easing.linear,
            toValue: 1,
            useNativeDriver: true
          }),
          Animated.timing(progress, {
            duration: 0,
            toValue: 0,
            useNativeDriver: true
          })
        ])
      )
    );

    opening.start();
    ambientLoop.start();
    haloLoop.start();
    sweepLoop.start();
    sparkLoops.forEach((animation) => animation.start());
    const enterTimer = setTimeout(() => setEnterReady(true), 1450);

    return () => {
      opening.stop();
      ambientLoop.stop();
      haloLoop.stop();
      sweepLoop.stop();
      sparkLoops.forEach((animation) => animation.stop());
      clearTimeout(enterTimer);
    };
  }, [ambient, buttonEntrance, entrance, exit, halo, reduceMotion, sparkAnimations, sweep, titleEntrance, visible]);

  function handleEnter() {
    if (!enterReady) {
      return;
    }

    if (reduceMotion) {
      setVisible(false);
      return;
    }

    Animated.timing(exit, {
      duration: 360,
      easing: Easing.inOut(Easing.cubic),
      toValue: 0,
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) {
        setVisible(false);
      }
    });
  }

  if (!visible) {
    return null;
  }

  return (
    <Modal
      animationType="none"
      onRequestClose={handleEnter}
      presentationStyle="fullScreen"
      statusBarTranslucent
      visible={visible}
    >
      <Animated.View
        style={[
          styles.modal,
          {
            opacity: Animated.multiply(entrance, exit),
            transform: [
              {
                scale: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1.14, 1.06]
                })
              },
              {
                scale: exit.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1.015, 1]
                })
              }
            ]
          }
        ]}
      >
        <ImageBackground source={launchArt} resizeMode="cover" style={styles.artwork}>
          <View style={styles.deepScrim} />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ambientGlow,
              {
                opacity: ambient.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.48] }),
                transform: [
                  { scale: ambient.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] }) }
                ]
              }
            ]}
          />

          <Animated.View
            pointerEvents="none"
            style={[
              styles.sweep,
              {
                opacity: sweep.interpolate({
                  inputRange: [0, 0.12, 0.5, 0.88, 1],
                  outputRange: [0, 0.15, 0.55, 0.15, 0]
                }),
                transform: [
                  { rotate: "18deg" },
                  { translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-420, 420] }) }
                ]
              }
            ]}
          >
            <LinearGradient
              colors={["transparent", "rgba(117, 179, 255, 0.16)", "rgba(255, 236, 194, 0.72)", "transparent"]}
              locations={[0, 0.38, 0.54, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Animated.View
              style={[
                styles.halo,
                compact && styles.haloCompact,
                {
                  opacity: halo.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0.52, 0] }),
                  transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [0.66, 1.48] }) }]
                }
              ]}
            />
            <Animated.View
              style={[
                styles.haloRing,
                compact && styles.haloCompact,
                {
                  opacity: halo.interpolate({ inputRange: [0, 0.38, 1], outputRange: [0, 0.44, 0] }),
                  transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [0.58, 1.62] }) }]
                }
              ]}
            />
            {sparks.map((spark, index) => {
              const progress = sparkAnimations[index];
              if (!progress) {
                return null;
              }
              return (
                <Animated.View
                  key={`${spark.x}-${spark.y}`}
                  style={[
                    styles.spark,
                    {
                      left: spark.x,
                      opacity: progress.interpolate({
                        inputRange: [0, 0.12, 0.64, 1],
                        outputRange: [0, 0.9, 0.6, 0]
                      }),
                      top: spark.y,
                      transform: [
                        { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, spark.driftX] }) },
                        { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, spark.rise] }) },
                        { scale: spark.scale }
                      ]
                    }
                  ]}
                />
              );
            })}
          </View>

          <SafeAreaView style={styles.safeArea}>
            <Animated.View
              style={[
                styles.titleStack,
                compact && styles.titleStackCompact,
                {
                  opacity: titleEntrance,
                  transform: [
                    { translateY: titleEntrance.interpolate({ inputRange: [0, 1], outputRange: [38, 0] }) }
                  ]
                }
              ]}
            >
              <Text maxFontSizeMultiplier={1.1} numberOfLines={1} style={[styles.title, compact && styles.titleCompact]}>
                Not Alone
              </Text>
              <Text maxFontSizeMultiplier={1.1} numberOfLines={1} style={[styles.title, compact && styles.titleCompact]}>
                Summit
              </Text>
              <LinearGradient
                colors={["#76B8FF", "#FFF1CA", "#F1C461"]}
                end={{ x: 1, y: 0.5 }}
                start={{ x: 0, y: 0.5 }}
                style={styles.yearCapsule}
              >
                <Text style={styles.yearText}>2026</Text>
              </LinearGradient>
            </Animated.View>

            <Animated.View
              style={[
                styles.enterWrap,
                compact && styles.enterWrapCompact,
                {
                  opacity: buttonEntrance,
                  transform: [
                    { translateY: buttonEntrance.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }
                  ]
                }
              ]}
            >
              <Pressable
                accessibilityHint="Opens the summit home screen"
                accessibilityLabel="Enter Not Alone Summit"
                accessibilityRole="button"
                disabled={!enterReady}
                onPress={handleEnter}
                style={({ pressed }) => [styles.enterButton, pressed && styles.enterPressed]}
              >
                <Text style={styles.enterText}>ENTER</Text>
              </Pressable>
            </Animated.View>
          </SafeAreaView>
        </ImageBackground>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: "#020714",
    flex: 1
  },
  artwork: {
    backgroundColor: "#020714",
    flex: 1,
    overflow: "hidden"
  },
  deepScrim: {
    backgroundColor: "rgba(1, 6, 19, 0.16)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  ambientGlow: {
    alignSelf: "center",
    backgroundColor: "rgba(82, 139, 255, 0.18)",
    borderRadius: 190,
    height: 380,
    position: "absolute",
    shadowColor: "#78AFFF",
    shadowOpacity: 0.7,
    shadowRadius: 54,
    top: "23%",
    width: 380
  },
  sweep: {
    height: "145%",
    left: "-25%",
    position: "absolute",
    top: "-22%",
    width: 190
  },
  halo: {
    alignSelf: "center",
    backgroundColor: "rgba(108, 164, 255, 0.16)",
    borderRadius: 138,
    height: 276,
    position: "absolute",
    shadowColor: "#F4CA71",
    shadowOpacity: 0.75,
    shadowRadius: 36,
    top: "26%",
    width: 276
  },
  haloRing: {
    alignSelf: "center",
    borderColor: "rgba(255, 226, 164, 0.78)",
    borderRadius: 138,
    borderWidth: 1,
    height: 276,
    position: "absolute",
    top: "26%",
    width: 276
  },
  haloCompact: {
    height: 220,
    top: "22%",
    width: 220
  },
  spark: {
    backgroundColor: "#FFF1C9",
    borderRadius: 3,
    height: 4,
    position: "absolute",
    shadowColor: "#F2C15C",
    shadowOpacity: 1,
    shadowRadius: 5,
    width: 4
  },
  safeArea: {
    flex: 1
  },
  titleStack: {
    alignItems: "center",
    left: 22,
    position: "absolute",
    right: 22,
    top: "52%"
  },
  titleStackCompact: {
    top: "47%"
  },
  title: {
    color: "#FAFCFF",
    fontFamily: typography.black,
    fontSize: 50,
    fontWeight: "900",
    lineHeight: 53,
    maxWidth: 350,
    textAlign: "center",
    width: "100%"
  },
  titleCompact: {
    fontSize: 43,
    lineHeight: 46
  },
  yearCapsule: {
    alignItems: "center",
    borderRadius: 24,
    height: 44,
    justifyContent: "center",
    marginTop: 18,
    shadowColor: "#E6C06F",
    shadowOpacity: 0.4,
    shadowRadius: 20,
    width: 128
  },
  yearText: {
    color: colors.midnight,
    fontFamily: typography.black,
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: 3.4,
    paddingLeft: 3.4
  },
  enterWrap: {
    alignSelf: "center",
    bottom: 78,
    position: "absolute",
    width: 164
  },
  enterWrapCompact: {
    bottom: 38
  },
  enterButton: {
    alignItems: "center",
    backgroundColor: "rgba(2, 10, 31, 0.82)",
    borderColor: "rgba(255, 235, 194, 0.62)",
    borderRadius: 23,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    shadowColor: "#E6C06F",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18
  },
  enterPressed: {
    backgroundColor: "rgba(21, 37, 76, 0.92)",
    transform: [{ scale: 0.98 }]
  },
  enterText: {
    color: "rgba(249, 251, 255, 0.96)",
    fontFamily: typography.black,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 2.2,
    paddingLeft: 2.2
  }
});
