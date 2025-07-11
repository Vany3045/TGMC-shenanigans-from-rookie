import { useBackend, useLocalState } from 'tgui/backend';
import { Window } from 'tgui/layouts';
import {
  Button,
  Collapsible,
  Icon,
  Image,
  Input,
  LabeledList,
  NoticeBox,
  Section,
  Stack,
} from 'tgui-core/components';
import { capitalizeFirst } from 'tgui-core/string';

import {
  getDisplayColor,
  getDisplayName,
  isJobCkeyOrNameMatch,
} from './helpers';
import type { Observable, OrbitData } from './types';

export const Orbit = (props) => {
  return (
    <Window title="Orbit" width={400} height={550}>
      <Window.Content scrollable>
        <Stack fill vertical>
          <Stack.Item>
            <ObservableSearch />
          </Stack.Item>
          <Stack.Item mt={0.2} grow>
            <Section fill>
              <ObservableContent />
            </Section>
          </Stack.Item>
        </Stack>
      </Window.Content>
    </Window>
  );
};

/** Controls filtering out the list of observables via search */
const ObservableSearch = (props) => {
  const { act, data } = useBackend<OrbitData>();
  const {
    auto_observe,
    humans = [],
    marines = [],
    som = [],
    survivors = [],
    xenos = [],
  } = data;
  const [searchQuery, setSearchQuery] = useLocalState<string>(
    'searchQuery',
    '',
  );

  /** Gets a list of Observables, then filters the most relevant to orbit */
  function orbitMostRelevant() {
    const mostRelevant = [humans, marines, som, survivors, xenos]
      .flat()
      .filter((observable) => isJobCkeyOrNameMatch(observable, searchQuery))
      .sort((observable) => -(observable.orbiters || 0))[0];

    if (mostRelevant !== undefined) {
      act('orbit', {
        ref: mostRelevant.ref,
      });
    }
  }

  return (
    <Section>
      <Stack>
        <Stack.Item>
          <Icon name="search" />
        </Stack.Item>
        <Stack.Item grow>
          <Input
            autoFocus
            fluid
            onEnter={orbitMostRelevant}
            onChange={setSearchQuery}
            placeholder="Search..."
            value={searchQuery}
          />
        </Stack.Item>
        <Stack.Divider />
        <Stack.Item>
          <Button
            color={auto_observe ? 'good' : 'transparent'}
            icon={auto_observe ? 'toggle-on' : 'toggle-off'}
            onClick={() => act('toggle_observe')}
            tooltip={`Toggle Auto-Observe. When active, you'll
            see the UI / full inventory of whoever you're orbiting. Neat!`}
            tooltipPosition="bottom-start"
          />
        </Stack.Item>
        <Stack.Item>
          <Button
            color="transparent"
            icon="sync-alt"
            onClick={() => act('refresh')}
            tooltip="Refresh"
            tooltipPosition="bottom-start"
          />
        </Stack.Item>
      </Stack>
    </Section>
  );
};

/**
 * The primary content display for points of interest.
 * Renders a scrollable section replete with subsections for each
 * observable group.
 */
const ObservableContent = (props) => {
  const { data } = useBackend<OrbitData>();
  const {
    dead = [],
    ghosts = [],
    humans = [],
    marines = [],
    misc = [],
    npcs = [],
    som = [],
    survivors = [],
    xenos = [],
  } = data;

  return (
    <Stack vertical>
      <ObservableSection color="violet" section={xenos} title="Xenomorphs" />
      <ObservableSection color="blue" section={marines} title="Marines" />
      <ObservableSection color="teal" section={humans} title="Humans" />
      <ObservableSection color="good" section={survivors} title="Survivors" />
      <ObservableSection color="average" section={som} title="SOM" />
      <ObservableSection section={dead} title="Dead" />
      <ObservableSection section={ghosts} title="Ghosts" />
      <ObservableSection section={misc} title="Misc" />
      <ObservableSection section={npcs} title="NPCs" />
    </Stack>
  );
};

/** Sorts based on real name */
export function sortByDisplayName(poiA: Observable, poiB: Observable): number {
  const nameA = getDisplayName(poiA.full_name, poiA.nickname)
    .replace(/^"/, '')
    .toLowerCase();
  const nameB = getDisplayName(poiB.full_name, poiB.nickname)
    .replace(/^"/, '')
    .toLowerCase();

  if (nameA < nameB) {
    return -1;
  }
  if (nameA > nameB) {
    return 1;
  }
  return 0;
}

/**
 * Displays a collapsible with a map of observable items.
 * Filters the results if there is a provided search query.
 */
const ObservableSection = (props: {
  color?: string;
  section: Array<Observable>;
  title: string;
}) => {
  const { color, section = [], title } = props;
  if (!section.length) {
    return null;
  }
  const [searchQuery] = useLocalState<string>('searchQuery', '');
  const filteredSection = section.filter((observable) =>
    isJobCkeyOrNameMatch(observable, searchQuery),
  );

  filteredSection.sort(sortByDisplayName);

  if (!filteredSection.length) {
    return null;
  }

  return (
    <Stack.Item>
      <Collapsible
        bold
        color={color ?? 'grey'}
        open={!!color}
        title={title + ` - (${filteredSection.length})`}
      >
        {filteredSection.map((poi, index) => {
          return <ObservableItem color={color} item={poi} key={index} />;
        })}
      </Collapsible>
    </Stack.Item>
  );
};

/** Renders an observable button that has tooltip info for living Observables*/
const ObservableItem = (props: { color?: string; item: Observable }) => {
  const { act } = useBackend<OrbitData>();
  const { color, item } = props;
  const { health, icon, full_name, nickname, orbiters, ref } = item;

  return (
    <Button
      color={getDisplayColor(item, !!color)}
      onClick={() => act('orbit', { ref: ref })}
      tooltip={!!health && <ObservableTooltip item={item} />}
      tooltipPosition="bottom-start"
    >
      {!!icon && <ObservableIcon icon={icon} />}
      {capitalizeFirst(getDisplayName(full_name, nickname))}
      {!!orbiters && (
        <>
          {' '}
          <Icon mr={0} name={'ghost'} />
          {orbiters}
        </>
      )}
    </Button>
  );
};

/** Displays some info on the mob as a tooltip. */
const ObservableTooltip = (props: { item: Observable }) => {
  const {
    item: { caste, health, job, full_name },
  } = props;
  const displayHealth = !!health && health >= 0 ? `${health}%` : 'Critical';

  return (
    <>
      <NoticeBox textAlign="center" nowrap>
        Last Known Data
      </NoticeBox>
      <LabeledList>
        {!!full_name && (
          <LabeledList.Item label="Full Name">{full_name}</LabeledList.Item>
        )}
        {!!caste && <LabeledList.Item label="Caste">{caste}</LabeledList.Item>}
        {!!job && <LabeledList.Item label="Job">{job}</LabeledList.Item>}
        {!!health && (
          <LabeledList.Item label="Health">{displayHealth}</LabeledList.Item>
        )}
      </LabeledList>
    </>
  );
};

/** Generates a small icon for buttons based on ICONMAP */
const ObservableIcon = (props: { icon: Observable['icon'] }) => {
  const { data } = useBackend<OrbitData>();
  const { icons = [] } = data;
  const { icon } = props;
  if (!icon || !icons[icon]) {
    return null;
  }

  return (
    <Image
      mr={1.5}
      src={`data:image/jpeg;base64,${icons[icon]}`}
      style={{
        transform: 'scale(2) translatey(-1px)',
      }}
    />
  );
};
