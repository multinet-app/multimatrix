import { ProvenanceEventTypes, State } from '@/types';
import { createAction } from '@visdesignlab/trrack';

export function updateProvenanceState(vuexState: State, label: ProvenanceEventTypes) {
  /* eslint-disable no-param-reassign */

  const stateUpdateActions = createAction<State, State[], ProvenanceEventTypes>((provState, newProvState) => {
    if (label === 'Set Select Neighbors') {
      provState.selectNeighbors = newProvState.selectNeighbors;
    } else if (label === 'Set Show Grid Lines') {
      provState.showGridLines = newProvState.showGridLines;
    } else if (label === 'Set Directional Edges') {
      provState.directionalEdges = newProvState.directionalEdges;
    } else if (label === 'Select Cell' || label === 'De-Select Cell') {
      provState.selectedCell = newProvState.selectedCell;
    } else if (label === 'Select Node(s)' || label === 'De-select Node(s)') {
      provState.selectedNodes = newProvState.selectedNodes;
    } else if (label === 'Set Label Variable') {
      provState.labelVariable = newProvState.labelVariable;
    }

    /* eslint-enable no-param-reassign */
  })
    .setLabel(label);

  if (vuexState.provenance !== null) {
    vuexState.provenance.apply(stateUpdateActions(vuexState));
  }
}

export function undoRedoKeyHandler(event: KeyboardEvent, storeState: State) {
  // If provenance doesn't exist, exit
  if (storeState.provenance == null) { return; }

  if (
    (event.ctrlKey && event.code === 'KeyZ' && !event.shiftKey) // ctrl + z (no shift)
      || (event.metaKey && event.code === 'KeyZ' && !event.shiftKey) // meta + z (no shift)
  ) {
    if (storeState.provenance.current.id !== storeState.provenance.root.id) {
      storeState.provenance.undo();
    }
  } else if (
    (event.ctrlKey && event.code === 'KeyY') // ctrl + y
      || (event.ctrlKey && event.code === 'KeyZ' && event.shiftKey) // ctrl + shift + z
      || (event.metaKey && event.code === 'KeyY') // meta + y
      || (event.metaKey && event.code === 'KeyZ' && event.shiftKey) // meta + shift + z
  ) {
    if (storeState.provenance.current.children.length > 0) {
      storeState.provenance.redo();
    }
  }
}
