import {TV_CHANNEL_IMAGE_MAX_BYTES, tvChannelImageProblem, tvChannelLabel, tvChannelsLabel} from './tv-channels';

describe('tv-channels', () => {
  describe('tvChannelLabel', () => {
    it('adds the dial when the channel has one', () => {
      expect(tvChannelLabel({name: 'M+ LaLiga', dial: '54'})).toBe('M+ LaLiga (54)');
      expect(tvChannelLabel({name: 'DAZN LaLiga', dial: null})).toBe('DAZN LaLiga');
    });
  });

  describe('tvChannelsLabel', () => {
    it('joins the channels in the order they come', () => {
      expect(tvChannelsLabel([{name: 'M+ LaLiga', dial: '54'}, {name: 'DAZN LaLiga', dial: null}])).toBe('M+ LaLiga (54) · DAZN LaLiga');
    });

    it('is null when there are none', () => {
      expect(tvChannelsLabel([])).toBeNull();
      expect(tvChannelsLabel(undefined)).toBeNull();
    });
  });

  describe('tvChannelImageProblem', () => {
    it('accepts the formats and the size the API accepts', () => {
      expect(tvChannelImageProblem({type: 'image/png', size: 1024})).toBeNull();
      expect(tvChannelImageProblem({type: 'image/webp', size: TV_CHANNEL_IMAGE_MAX_BYTES})).toBeNull();
    });

    it('refuses other formats, SVG included, and files too big', () => {
      expect(tvChannelImageProblem({type: 'image/svg+xml', size: 1024})).toBe('tv-channel.image-invalid-type');
      expect(tvChannelImageProblem({type: 'application/pdf', size: 1024})).toBe('tv-channel.image-invalid-type');
      expect(tvChannelImageProblem({type: 'image/jpeg', size: TV_CHANNEL_IMAGE_MAX_BYTES + 1})).toBe('tv-channel.image-too-big');
    });
  });
});
