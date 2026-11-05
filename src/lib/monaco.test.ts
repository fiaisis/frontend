import { beforeEach, describe, expect, test, vi } from 'vitest';

const { configMock } = vi.hoisted(() => ({ configMock: vi.fn() }));

vi.mock('@monaco-editor/react', () => ({ loader: { config: configMock } }));

describe('Monaco loader configuration', () => {
  beforeEach(() => {
    configMock.mockClear();
    // The module under test configures the loader as an import side effect, so it has to be
    // re-imported for each test to observe the call again.
    vi.resetModules();
  });

  test('points the AMD loader at the monaco/vs copy served by the plugin itself', async () => {
    const { MONACO_VS_PATH } = await import('./monaco');

    expect(configMock).toHaveBeenCalledTimes(1);
    expect(configMock).toHaveBeenCalledWith({ paths: { vs: MONACO_VS_PATH } });
  });

  test('does not leave the loader on its jsDelivr CDN default', async () => {
    const { MONACO_VS_PATH } = await import('./monaco');

    expect(MONACO_VS_PATH).not.toContain('cdn.jsdelivr.net');
    expect(MONACO_VS_PATH).not.toContain('http');
    // `base` is '/' when VITE_PLUGIN_URL is unset (development and tests), and '/f-i-a/' when the
    // plugin is built for SciGateway — both are served by this repo's own assets.
    expect(MONACO_VS_PATH).toBe(`${import.meta.env.BASE_URL}monaco/vs`);
    expect(MONACO_VS_PATH).toBe('/monaco/vs');
  });
});
