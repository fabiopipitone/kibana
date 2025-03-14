/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProductLine } from '../../../common/config';
import { CardId, StepId } from '../../components/get_started/types';
import { storage } from '../storage';

export const ACTIVE_PRODUCTS_STORAGE_KEY = 'ACTIVE_PRODUCTS';
export const FINISHED_STEPS_STORAGE_KEY = 'FINISHED_STEPS';

export const getStartedStorage = {
  getActiveProductsFromStorage: () => {
    const activeProducts: ProductLine[] = storage.get(ACTIVE_PRODUCTS_STORAGE_KEY);
    return activeProducts ?? new Array();
  },
  toggleActiveProductsInStorage: (productId: ProductLine) => {
    const activeProducts: ProductLine[] =
      storage.get(ACTIVE_PRODUCTS_STORAGE_KEY) ?? new Array<ProductLine>();
    const index = activeProducts.indexOf(productId);
    if (index < 0) {
      activeProducts.push(productId);
    } else {
      activeProducts.splice(index, 1);
    }
    storage.set(ACTIVE_PRODUCTS_STORAGE_KEY, activeProducts);
    return activeProducts;
  },
  getFinishedStepsFromStorageByCardId: (cardId: CardId) => {
    const finishedSteps = storage.get(FINISHED_STEPS_STORAGE_KEY) ?? {};
    const card: StepId[] = finishedSteps[cardId] ?? new Array<StepId>();
    return card;
  },
  getAllFinishedStepsFromStorage: () => {
    const allFinishedSteps: Record<CardId, StepId[]> =
      storage.get(FINISHED_STEPS_STORAGE_KEY) ?? {};
    return allFinishedSteps;
  },
  addFinishedStepToStorage: (cardId: CardId, stepId: StepId) => {
    const finishedSteps: Record<CardId, StepId[]> = storage.get(FINISHED_STEPS_STORAGE_KEY) ?? {};
    const card: StepId[] = finishedSteps[cardId] ?? new Array<StepId>();
    if (card.indexOf(stepId) < 0) {
      card.push(stepId);
      storage.set(FINISHED_STEPS_STORAGE_KEY, { ...finishedSteps, [cardId]: card });
    }
  },
  removeFinishedStepFromStorage: (cardId: CardId, stepId: StepId) => {
    const finishedSteps = storage.get(FINISHED_STEPS_STORAGE_KEY) ?? {};
    const steps: StepId[] = finishedSteps[cardId] ?? new Array<StepId>();
    const index = steps.indexOf(stepId);
    if (index >= 0) {
      steps.splice(index, 1);
    }
    storage.set(FINISHED_STEPS_STORAGE_KEY, { ...finishedSteps, [cardId]: steps });
  },
};
