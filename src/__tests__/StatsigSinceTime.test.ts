/**
 * @jest-environment jsdom
 */

import StatsigClient from '../StatsigClient';
import { INTERNAL_STORE_KEY } from '../utils/Constants';
import Statsig from '..';
import LocalStorageMock from './LocalStorageMock';
import * as TestData from './initialize_response.json';
import { getHashValue, getUserCacheKey } from '../utils/Hashing';

describe('Verify behavior of StatsigClient with sinceTime', () => {
  const sdkKey = 'client-clienttestkey';
  var parsedRequestBody;

  const gate = {
    'AoZS0F06Ub+W2ONx+94rPTS7MRxuxa+GnXro5Q1uaGY=': {
      value: true,
      rule_id: 'ruleID12',
      secondary_exposures: [
        {
          gate: 'dependent_gate_1',
          gateValue: 'true',
          ruleID: 'rule_1',
        },
      ],
    },
  };

  const localStorage = new LocalStorageMock();
  // @ts-ignore
  Object.defineProperty(window, 'localStorage', {
    value: localStorage,
  });

  // @ts-ignore
  global.fetch = jest.fn((url, params) => {
    if (
      url &&
      typeof url === 'string' &&
      url.includes('initialize') &&
      url !== 'https://featuregates.org/v1/initialize'
    ) {
      return Promise.reject(new Error('invalid initialize endpoint'));
    }
    parsedRequestBody = JSON.parse(params?.body as string);
    return Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(TestData)),
    });
  });

  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    parsedRequestBody = null;

    Statsig.encodeIntializeCall = false;
    localStorage.clear();
    localStorage.setItem(
      INTERNAL_STORE_KEY,
      JSON.stringify({
        first: {
          feature_gates: gate,
          dynamic_configs: [],
          time: 1646026677415,
        },
      }),
    );
  });

  test('Test sincetime provided to network request', async () => {
    expect.assertions(4);
    const user = { userID: 'zenyatta' };
    const stableID = 'Experience Tranquility';

    const statsig = new StatsigClient(sdkKey, user, {
      overrideStableID: stableID,
    });
    // @ts-ignore
    const spy = jest.spyOn(statsig.getNetwork(), 'fetchValues');
    await statsig.initializeAsync();
    expect(spy).toHaveBeenCalledWith(
      user,
      null,
      expect.anything(),
      expect.anything(),
      expect.anything(),
      undefined,
    );

    const key = getUserCacheKey(stableID, user);
    const userHash = getHashValue(JSON.stringify(user));
    const storeObject = JSON.parse(
      localStorage.getItem(INTERNAL_STORE_KEY) ?? '',
    );

    expect(storeObject[key].user_hash).toEqual(userHash);
    expect(storeObject[key].time).toEqual(1646026677490);

    await statsig.updateUser(user);
    expect(spy).toHaveBeenCalledWith(
      user,
      1646026677490,
      expect.anything(),
      expect.anything(),
      expect.anything(),
      undefined,
    );
  });
});
