# iOS Simulator Warnings (Expected, Safe to Ignore)

When running the app in the iOS Simulator, you may see these logs. They are **system-level** and do not indicate bugs in our code.

## 1. libapp_launch_measurement – Failed to send CA Event

```
[libapp_launch_measurement.dylib] Failed to send CA Event for app launch measurements...
```

**Cause:** Apple's internal framework for measuring app launch performance. It tries to report metrics to Apple's servers.

**Why it fails:** The simulator cannot reach Apple's analytics endpoints (or they're disabled in dev).

**Fix:** None. We cannot control Apple's internal frameworks. This does not affect app behavior.

---

## 2. Gesture: System gesture gate timed out

```
[UIKitCore] Gesture: System gesture gate timed out.
```

**Cause:** iOS's gesture recognizer system occasionally times out in the simulator when the system is under load.

**Mitigations we use:** We defer auth/session loading with `InteractionManager.runAfterInteractions()` so the first frame and gestures complete before heavy work runs.

**Fix:** Usually resolves itself. More common in simulator than on device.

---

## 3. TextInputUI Result accumulator timeout

```
[TextInputUI] Result accumulator timeout: 0.250000, exceeded.
```

**Cause:** iOS's text input subsystem (keyboard/autocomplete) had a 250ms timeout exceeded. Common when the simulator is slow or on first keyboard appearance.

**Mitigations we use:** We set `autoComplete="off"` on TextInputs where autocomplete isn't needed to reduce processing.

**Fix:** Usually harmless. Test on a real device if it persists.
