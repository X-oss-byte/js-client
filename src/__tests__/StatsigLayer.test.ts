/**
 * @jest-environment jsdom
 */
import StatsigClient from '../StatsigClient';
import { getHashValue } from '../utils/Hashing';
import StatsigAsyncStorage from '../utils/StatsigAsyncStorage';
import LocalStorageMock from './LocalStorageMock';

const configKey = 'a_config';
const hashedConfigKey = getHashValue(configKey);

const anotherConfigKey = 'another_config';
const hashedAnotherConfigKey = getHashValue(anotherConfigKey);

const dynamicConfigs = {
  [hashedConfigKey]: {
    name: hashedConfigKey,
    rule_id: 'default',
    value: { a_key: 'a_config_value' },
    is_user_in_experiment: true,
    is_experiment_active: true,
  },
  [hashedAnotherConfigKey]: {
    name: hashedAnotherConfigKey,
    rule_id: 'default',
    value: { a_key: 'another_config_value' },
    is_user_in_experiment: true,
    is_experiment_active: true,
  },
};

const layerConfigWithExperimentKey = 'allocated_experiment';
const hashedLayerConfigWithExperimentKey = getHashValue(
  layerConfigWithExperimentKey,
);

const layerConfigWithoutExperimentKey = 'unallocated_experiment';
const hashedLayerConfigWithoutExperimentKey = getHashValue(
  layerConfigWithoutExperimentKey,
);

const layerConfigs = {
  [hashedLayerConfigWithExperimentKey]: {
    name: hashedLayerConfigWithExperimentKey,
    rule_id: 'default',
    value: { a_key: 'a_config_value' },
    is_user_in_experiment: true,
    is_experiment_active: true,
    allocated_experiment_name: hashedConfigKey,
  },
  [hashedLayerConfigWithoutExperimentKey]: {
    name: hashedLayerConfigWithoutExperimentKey,
    rule_id: 'default',
    value: { a_key: 'another_layer_default_value' },
    is_user_in_experiment: true,
    is_experiment_active: true,
  },
};

const initialResponse = {
  feature_gates: {},
  dynamic_configs: dynamicConfigs,
  layer_configs: layerConfigs,
  has_updates: true,
};

describe('Statsig Layers', () => {
  var client: StatsigClient;

  const localStorage = new LocalStorageMock();
  // @ts-ignore
  Object.defineProperty(window, 'localStorage', {
    value: localStorage,
  });

  // @ts-ignore
  global.fetch = jest.fn((_url, _params) => {
    return Promise.resolve({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(initialResponse)),
    });
  });

  beforeEach(async () => {
    jest.resetModules();
    window.localStorage.clear();
    client = new StatsigClient('client-key', { userID: 'dloomb' });
    await client.initializeAsync();
  });

  afterEach(() => {
    // @ts-ignore
    (StatsigAsyncStorage as any).asyncStorage = null;
  });

  it('returns experiment values when allocated', () => {
    let config = client.getLayer(layerConfigWithExperimentKey);
    expect(config.get('a_key', 'ERR')).toBe('a_config_value');

    let another = client.getLayer(layerConfigWithoutExperimentKey);
    expect(another.get('a_key', 'ERR')).toBe('another_layer_default_value');
  });

  it('returns a sticky value', async () => {
    let config = client.getLayer(layerConfigWithExperimentKey, true);
    expect(config.get('a_key', 'ERR')).toBe('a_config_value');

    const data = JSON.parse(JSON.stringify(initialResponse));
    data['layer_configs'][hashedLayerConfigWithExperimentKey] = {
      name: hashedLayerConfigWithExperimentKey,
      rule_id: 'default',
      value: { a_key: 'another_value' },
      is_user_in_experiment: true,
      is_experiment_active: true,
      allocated_experiment_name: hashedAnotherConfigKey,
    };
    await client.getStore().save(client.getCurrentUser(), data);

    config = client.getLayer(layerConfigWithExperimentKey, true);
    expect(config.get('a_key', 'ERR')).toBe('a_config_value');
  });

  it('wipes the sticky value when keepDeviceValue is false', async () => {
    let config = client.getLayer(layerConfigWithExperimentKey, true);
    expect(config.get('a_key', 'ERR')).toBe('a_config_value');

    const data = JSON.parse(JSON.stringify(initialResponse));
    data['layer_configs'][hashedLayerConfigWithExperimentKey] = {
      name: hashedLayerConfigWithExperimentKey,
      rule_id: 'default',
      value: { a_key: 'another_value' },
      is_user_in_experiment: true,
      is_experiment_active: true,
      allocated_experiment_name: hashedAnotherConfigKey,
    };
    await client.getStore().save(client.getCurrentUser(), data);

    config = client.getLayer(layerConfigWithExperimentKey, false);
    expect(config.get('a_key', 'ERR')).toBe('another_value');
  });
});
