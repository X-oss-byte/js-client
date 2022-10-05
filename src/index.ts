import DynamicConfig from './DynamicConfig';
import { StatsigUninitializedError } from './Errors';
import Layer from './Layer';
import StatsigClient, { StatsigOverrides } from './StatsigClient';
import StatsigRuntime from './StatsigRuntime';
import { StatsigOptions } from './StatsigSDKOptions';
import { EvaluationDetails, EvaluationReason } from './StatsigStore';
import { StatsigUser } from './StatsigUser';
import { default as PolyfillObjectEntries } from './utils/Object.entries';
import { default as PolyfillObjectFromEntries } from './utils/Object.fromEntries';
import { default as PolyfillPromiseFinally } from './utils/Promise.finally';

export { default as DynamicConfig } from './DynamicConfig';
export { default as Layer } from './Layer';
export {
  default as StatsigClient,
  IStatsig,
  StatsigOverrides,
} from './StatsigClient';
export type {
  AppState,
  AppStateEvent,
  AppStateStatus,
  _SDKPackageInfo as _SDKPackageInfo,
} from './StatsigClient';
export type {
  DeviceInfo,
  ExpoConstants,
  ExpoDevice,
  NativeModules,
  Platform,
  UUID,
} from './StatsigIdentity';
export { StatsigEnvironment, StatsigOptions } from './StatsigSDKOptions';
export { EvaluationReason } from './StatsigStore';
export type { EvaluationDetails } from './StatsigStore';
export { StatsigUser } from './StatsigUser';
export { default as StatsigAsyncStorage } from './utils/StatsigAsyncStorage';
export type { AsyncStorage } from './utils/StatsigAsyncStorage';
export type { InitCompletionCallback } from './StatsigSDKOptions';

PolyfillObjectEntries();
PolyfillObjectFromEntries();
PolyfillPromiseFinally();

export default class Statsig {
  private static instance: StatsigClient | null = null;

  static get encodeIntializeCall(): boolean {
    return StatsigRuntime.encodeInitializeCall;
  }

  static set encodeIntializeCall(value: boolean) {
    StatsigRuntime.encodeInitializeCall = value;
  }

  private constructor() {}

  public static async initialize(
    sdkKey: string,
    user?: StatsigUser | null,
    options?: StatsigOptions | null,
  ): Promise<void> {
    const inst = Statsig.instance ?? new StatsigClient(sdkKey, user, options);

    if (!Statsig.instance) {
      Statsig.instance = inst;
    }

    return inst.initializeAsync();
  }

  public static async prefetchUsers(users: StatsigUser[]): Promise<void> {
    return await Statsig.getClientX().prefetchUsers(users);
  }

  public static setInitializeValues(
    initializeValues: Record<string, unknown>,
  ): void {
    Statsig.getClientX().setInitializeValues(initializeValues);
  }

  public static checkGate(
    gateName: string,
    ignoreOverrides: boolean = false,
  ): boolean {
    return Statsig.getClientX().checkGate(gateName, ignoreOverrides);
  }

  public static getConfig(
    configName: string,
    ignoreOverrides: boolean = false,
  ): DynamicConfig {
    return Statsig.getClientX().getConfig(configName, ignoreOverrides);
  }

  public static getExperiment(
    experimentName: string,
    keepDeviceValue: boolean = false,
    ignoreOverrides: boolean = false,
  ): DynamicConfig {
    return Statsig.getClientX().getExperiment(
      experimentName,
      keepDeviceValue,
      ignoreOverrides,
    );
  }

  public static getLayer(
    layerName: string,
    keepDeviceValue: boolean = false,
  ): Layer {
    return Statsig.getClientX().getLayer(layerName, keepDeviceValue);
  }

  public static logEvent(
    eventName: string,
    value: string | number | null = null,
    metadata: Record<string, string> | null = null,
  ): void {
    return Statsig.getClientX().logEvent(eventName, value, metadata);
  }

  public static updateUser(user: StatsigUser | null): Promise<boolean> {
    return Statsig.getClientX().updateUser(user);
  }

  public static shutdown() {
    Statsig.getClientX().shutdown();
    Statsig.instance = null;
  }

  /**
   * Overrides the given gate locally with the given value
   * @param gateName - name of the gate to override
   * @param value - value to assign to the gate
   */
  public static overrideGate(gateName: string, value: boolean): void {
    Statsig.getClientX().overrideGate(gateName, value);
  }

  /**
   * Overrides the given config locally with the given value
   * @param configName - name of the config to override
   * @param value - value to assign to the config
   */
  public static overrideConfig(configName: string, value: object): void {
    Statsig.getClientX().overrideConfig(configName, value);
  }

  /**
   * @deprecated use removeGateOverride or removeConfigOverride
   * @param name the gate override to remove
   */
  public static removeOverride(name?: string): void {
    Statsig.getClientX().removeOverride(name);
  }

  /**
   * @param name the gate override to remove
   */
  public static removeGateOverride(name?: string): void {
    Statsig.getClientX().removeGateOverride(name);
  }

  /**
   * @param name the config override to remove
   */
  public static removeConfigOverride(name?: string): void {
    Statsig.getClientX().removeConfigOverride(name);
  }

  /**
   * @deprecated use getAllOverrides
   * @returns the gate overrides
   */
  public static getOverrides(): Record<string, any> {
    return Statsig.getClientX().getOverrides();
  }

  /**
   * @returns The local gate and config overrides
   */
  public static getAllOverrides(): StatsigOverrides {
    return Statsig.getClientX().getAllOverrides();
  }

  /**
   * @returns The Statsig stable ID used for device level experiments
   */
  public static getStableID(): string {
    return Statsig.getClientX().getStableID();
  }

  /**
   *
   * @returns The reason and time associated with the evaluation for the current set
   * of gates and configs
   */
  public static getEvaluationDetails(): EvaluationDetails {
    return (
      Statsig.instance?.getEvaluationDetails() ?? {
        reason: EvaluationReason.Uninitialized,
        time: 0,
      }
    );
  }

  private static getClientX(): StatsigClient {
    if (!Statsig.instance) {
      throw new StatsigUninitializedError();
    }
    return Statsig.instance;
  }
}
