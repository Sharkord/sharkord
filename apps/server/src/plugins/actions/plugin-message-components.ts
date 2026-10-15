import {
  PLUGIN_MESSAGE_COMPONENT_NAME_MAX_LENGTH,
  PLUGIN_MESSAGE_COMPONENTS_MAX,
  PLUGIN_MESSAGE_COMPONENTS_MAX_BYTES,
  type TPluginMessageComponent
} from '@sharkord/shared';
import { invariant } from '../../utils/invariant';
import { isPlainObject } from '../../utils/is-plain-object';

const parsePluginMessageComponents = (
  components: unknown
): TPluginMessageComponent[] => {
  invariant(Array.isArray(components), {
    code: 'BAD_REQUEST',
    message: 'Message components must be a list.'
  });

  invariant(components.length <= PLUGIN_MESSAGE_COMPONENTS_MAX, {
    code: 'BAD_REQUEST',
    message: `A message can carry at most ${PLUGIN_MESSAGE_COMPONENTS_MAX} components.`
  });

  const parsed = components.map((component) => {
    invariant(
      isPlainObject(component) &&
        typeof component.name === 'string' &&
        component.name.length > 0 &&
        component.name.length <= PLUGIN_MESSAGE_COMPONENT_NAME_MAX_LENGTH,
      {
        code: 'BAD_REQUEST',
        message: `Every message component needs a name of 1 to ${PLUGIN_MESSAGE_COMPONENT_NAME_MAX_LENGTH} characters.`
      }
    );

    const props = component.props ?? {};

    invariant(isPlainObject(props), {
      code: 'BAD_REQUEST',
      message: 'Message component props must be a JSON object.'
    });

    return { name: component.name, props };
  });

  invariant(
    Buffer.byteLength(JSON.stringify(parsed)) <=
      PLUGIN_MESSAGE_COMPONENTS_MAX_BYTES,
    {
      code: 'BAD_REQUEST',
      message: `Message components cannot exceed ${PLUGIN_MESSAGE_COMPONENTS_MAX_BYTES} bytes.`
    }
  );

  return parsed;
};

export { parsePluginMessageComponents };
