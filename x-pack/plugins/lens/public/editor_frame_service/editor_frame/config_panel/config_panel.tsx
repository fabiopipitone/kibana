/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, memo, useCallback } from 'react';
import { useStore } from 'react-redux';
import { EuiForm } from '@elastic/eui';
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { isOfAggregateQueryType } from '@kbn/es-query';
import {
  UPDATE_FILTER_REFERENCES_ACTION,
  UPDATE_FILTER_REFERENCES_TRIGGER,
} from '@kbn/unified-search-plugin/public';
import { changeIndexPattern, removeDimension } from '../../../state_management/lens_slice';
import { AddLayerFunction, Visualization } from '../../../types';
import { LayerPanel } from './layer_panel';
import { generateId } from '../../../id_generator';
import { ConfigPanelWrapperProps } from './types';
import { useFocusUpdate } from './use_focus_update';
import {
  setLayerDefaultDimension,
  useLensDispatch,
  removeOrClearLayer,
  cloneLayer,
  addLayer as addLayerAction,
  updateState,
  updateDatasourceState,
  updateVisualizationState,
  setToggleFullscreen,
  useLensSelector,
  selectVisualization,
  registerLibraryAnnotationGroup,
} from '../../../state_management';
import { getRemoveOperation } from '../../../utils';

export const ConfigPanelWrapper = memo(function ConfigPanelWrapper(props: ConfigPanelWrapperProps) {
  const visualization = useLensSelector(selectVisualization);

  const activeVisualization = visualization.activeId
    ? props.visualizationMap[visualization.activeId]
    : null;

  return activeVisualization && visualization.state ? (
    <LayerPanels {...props} activeVisualization={activeVisualization} />
  ) : null;
});

export function LayerPanels(
  props: ConfigPanelWrapperProps & {
    activeVisualization: Visualization;
  }
) {
  const lensStore = useStore();
  const { activeVisualization, datasourceMap, indexPatternService, onUpdateStateCb } = props;
  const { activeDatasourceId, visualization, datasourceStates, query } = useLensSelector(
    (state) => state.lens
  );

  const dispatchLens = useLensDispatch();

  const layerIds = activeVisualization.getLayerIds(visualization.state);
  const {
    setNextFocusedId: setNextFocusedLayerId,
    removeRef: removeLayerRef,
    registerNewRef: registerNewLayerRef,
  } = useFocusUpdate(layerIds);

  const setVisualizationState = useMemo(
    () => (newState: unknown) => {
      dispatchLens(
        updateVisualizationState({
          visualizationId: activeVisualization.id,
          newState,
        })
      );
      if (onUpdateStateCb && activeDatasourceId) {
        const dsState = datasourceStates[activeDatasourceId].state;
        onUpdateStateCb?.(dsState, newState);
      }
    },
    [activeDatasourceId, activeVisualization.id, datasourceStates, dispatchLens, onUpdateStateCb]
  );
  const updateDatasource = useMemo(
    () =>
      (datasourceId: string | undefined, newState: unknown, dontSyncLinkedDimensions?: boolean) => {
        if (datasourceId) {
          dispatchLens(
            updateDatasourceState({
              updater: (prevState: unknown) =>
                typeof newState === 'function' ? newState(prevState) : newState,
              datasourceId,
              clearStagedPreview: false,
              dontSyncLinkedDimensions,
            })
          );
          onUpdateStateCb?.(newState, visualization.state);
        }
      },
    [dispatchLens, onUpdateStateCb, visualization.state]
  );
  const updateDatasourceAsync = useMemo(
    () => (datasourceId: string | undefined, newState: unknown) => {
      // React will synchronously update if this is triggered from a third party component,
      // which we don't want. The timeout lets user interaction have priority, then React updates.
      setTimeout(() => {
        updateDatasource(datasourceId, newState);
      }, 0);
    },
    [updateDatasource]
  );

  const updateAll = useMemo(
    () =>
      (
        datasourceId: string | undefined,
        newDatasourceState: unknown,
        newVisualizationState: unknown
      ) => {
        if (!datasourceId) return;
        // React will synchronously update if this is triggered from a third party component,
        // which we don't want. The timeout lets user interaction have priority, then React updates.

        setTimeout(() => {
          dispatchLens(
            updateState({
              updater: (prevState) => {
                const updatedDatasourceState =
                  typeof newDatasourceState === 'function'
                    ? newDatasourceState(prevState.datasourceStates[datasourceId].state)
                    : newDatasourceState;

                const updatedVisualizationState =
                  typeof newVisualizationState === 'function'
                    ? newVisualizationState(prevState.visualization.state)
                    : newVisualizationState;

                return {
                  ...prevState,
                  datasourceStates: {
                    ...prevState.datasourceStates,
                    [datasourceId]: {
                      state: updatedDatasourceState,
                      isLoading: false,
                    },
                  },
                  visualization: {
                    ...prevState.visualization,
                    state: updatedVisualizationState,
                  },
                };
              },
            })
          );
          onUpdateStateCb?.(newDatasourceState, newVisualizationState);
        }, 0);
      },
    [dispatchLens, onUpdateStateCb]
  );

  const toggleFullscreen = useMemo(
    () => () => {
      dispatchLens(setToggleFullscreen());
    },
    [dispatchLens]
  );

  const onRemoveLayer = useCallback(
    (layerToRemoveId: string) => {
      const datasourcePublicAPI = props.framePublicAPI.datasourceLayers?.[layerToRemoveId];
      const datasourceId = datasourcePublicAPI?.datasourceId;

      if (datasourceId) {
        const layerDatasource = datasourceMap[datasourceId];
        const layerDatasourceState = datasourceStates?.[datasourceId]?.state;
        const trigger = props.uiActions.getTrigger(UPDATE_FILTER_REFERENCES_TRIGGER);
        const action = props.uiActions.getAction(UPDATE_FILTER_REFERENCES_ACTION);

        action?.execute({
          trigger,
          fromDataView: layerDatasource.getUsedDataView(layerDatasourceState, layerToRemoveId),
          usedDataViews: layerDatasource
            .getLayers(layerDatasourceState)
            .map((layer) => layerDatasource.getUsedDataView(layerDatasourceState, layer)),
          defaultDataView: layerDatasource.getUsedDataView(layerDatasourceState),
        } as ActionExecutionContext);
      }

      dispatchLens(
        removeOrClearLayer({
          visualizationId: activeVisualization.id,
          layerId: layerToRemoveId,
          layerIds,
        })
      );
      removeLayerRef(layerToRemoveId);
    },
    [
      activeVisualization.id,
      datasourceMap,
      datasourceStates,
      dispatchLens,
      layerIds,
      props.framePublicAPI.datasourceLayers,
      props.uiActions,
      removeLayerRef,
    ]
  );

  const onChangeIndexPattern = useCallback(
    async ({
      indexPatternId,
      datasourceId,
      visualizationId,
      layerId,
    }: {
      indexPatternId: string;
      datasourceId?: string;
      visualizationId?: string;
      layerId?: string;
    }) => {
      const indexPatterns = await props.indexPatternService?.ensureIndexPattern({
        id: indexPatternId,
        cache: props.framePublicAPI.dataViews.indexPatterns,
      });
      if (indexPatterns) {
        dispatchLens(
          changeIndexPattern({
            indexPatternId,
            datasourceIds: datasourceId ? [datasourceId] : [],
            visualizationIds: visualizationId ? [visualizationId] : [],
            layerId,
            dataViews: { indexPatterns },
          })
        );
      }
    },
    [dispatchLens, props.framePublicAPI.dataViews.indexPatterns, props.indexPatternService]
  );

  const addLayer: AddLayerFunction = (layerType, extraArg, ignoreInitialValues) => {
    const layerId = generateId();
    dispatchLens(addLayerAction({ layerId, layerType, extraArg, ignoreInitialValues }));
    setNextFocusedLayerId(layerId);
  };

  const hideAddLayerButton = query && isOfAggregateQueryType(query);

  return (
    <EuiForm className="lnsConfigPanel">
      {layerIds.map((layerId, layerIndex) => {
        const { hidden, groups } = activeVisualization.getConfiguration({
          layerId,
          frame: props.framePublicAPI,
          state: visualization.state,
        });

        return (
          !hidden && (
            <LayerPanel
              {...props}
              dimensionGroups={groups}
              activeVisualization={activeVisualization}
              registerNewLayerRef={registerNewLayerRef}
              key={layerId}
              layerId={layerId}
              layerIndex={layerIndex}
              visualizationState={visualization.state}
              updateVisualization={setVisualizationState}
              updateDatasource={updateDatasource}
              updateDatasourceAsync={updateDatasourceAsync}
              displayLayerSettings={!props.hideLayerHeader}
              onChangeIndexPattern={(args) => {
                onChangeIndexPattern(args);
                const layersToRemove =
                  activeVisualization.getLayersToRemoveOnIndexPatternChange?.(
                    visualization.state
                  ) ?? [];
                layersToRemove.forEach((id) => onRemoveLayer(id));
              }}
              updateAll={updateAll}
              addLayer={addLayer}
              isOnlyLayer={
                getRemoveOperation(
                  activeVisualization,
                  visualization.state,
                  layerId,
                  layerIds.length
                ) === 'clear'
              }
              onEmptyDimensionAdd={(columnId, { groupId }) => {
                // avoid state update if the datasource does not support initializeDimension
                if (
                  activeDatasourceId != null &&
                  datasourceMap[activeDatasourceId]?.initializeDimension
                ) {
                  dispatchLens(
                    setLayerDefaultDimension({
                      layerId,
                      columnId,
                      groupId,
                    })
                  );
                }
              }}
              onCloneLayer={() => {
                dispatchLens(
                  cloneLayer({
                    layerId,
                  })
                );
              }}
              onRemoveLayer={onRemoveLayer}
              onRemoveDimension={(dimensionProps) => {
                const datasourcePublicAPI = props.framePublicAPI.datasourceLayers?.[layerId];
                const datasourceId = datasourcePublicAPI?.datasourceId;
                dispatchLens(removeDimension({ ...dimensionProps, datasourceId }));
                if (datasourceId && onUpdateStateCb) {
                  const newState = lensStore.getState().lens;
                  onUpdateStateCb(
                    newState.datasourceStates[datasourceId].state,
                    newState.visualization.state
                  );
                }
              }}
              toggleFullscreen={toggleFullscreen}
              indexPatternService={indexPatternService}
            />
          )
        );
      })}
      {!hideAddLayerButton &&
        activeVisualization?.getAddLayerButtonComponent?.({
          supportedLayers: activeVisualization.getSupportedLayers(
            visualization.state,
            props.framePublicAPI
          ),
          addLayer,
          ensureIndexPattern: async (specOrId) => {
            let indexPatternId;

            if (typeof specOrId === 'string') {
              indexPatternId = specOrId;
            } else {
              const dataView = await props.dataViews.create(specOrId);

              if (!dataView.id) {
                return;
              }

              indexPatternId = dataView.id;
            }

            const newIndexPatterns = await indexPatternService?.ensureIndexPattern({
              id: indexPatternId,
              cache: props.framePublicAPI.dataViews.indexPatterns,
            });

            if (newIndexPatterns) {
              dispatchLens(
                changeIndexPattern({
                  dataViews: { indexPatterns: newIndexPatterns },
                  datasourceIds: Object.keys(datasourceStates),
                  visualizationIds: visualization.activeId ? [visualization.activeId] : [],
                  indexPatternId,
                })
              );
            }
          },
          registerLibraryAnnotationGroup: (groupInfo) =>
            dispatchLens(registerLibraryAnnotationGroup(groupInfo)),
        })}
    </EuiForm>
  );
}
