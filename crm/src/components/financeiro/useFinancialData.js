import { useEffect, useMemo, useState } from 'react';
import { collection, query } from 'firebase/firestore';
import { db, onSnapshot } from '../../firebaseConfig.js';

const COLLECTION_KEYS = ['contas_a_pagar', 'contas_a_receber', 'pedidos'];

const emptyFinancialData = () => ({
  contas_a_pagar: [],
  contas_a_receber: [],
  pedidos: []
});

const withStoreId = (snapshot, lojaId) => (
  snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data(), lojaId }))
);

export const useFinancialData = ({ storeIds = [], fallbackData = {} }) => {
  const storeKey = useMemo(
    () => Array.from(new Set(storeIds.filter(Boolean))).sort().join('|'),
    [storeIds]
  );
  const normalizedStoreIds = useMemo(() => storeKey.split('|').filter(Boolean), [storeKey]);
  const [state, setState] = useState({ data: emptyFinancialData(), loading: true, error: null });

  useEffect(() => {
    if (normalizedStoreIds.length) return undefined;
    setState({
      data: {
        contas_a_pagar: fallbackData.contas_a_pagar || [],
        contas_a_receber: fallbackData.contas_a_receber || [],
        pedidos: fallbackData.pedidos || []
      },
      loading: false,
      error: null
    });
    return undefined;
  }, [normalizedStoreIds, fallbackData]);

  useEffect(() => {
    if (!normalizedStoreIds.length) {
      return undefined;
    }

    let active = true;
    const storeResults = {};
    const subscriptions = [];
    let remaining = normalizedStoreIds.length * COLLECTION_KEYS.length;

    const emit = () => {
      if (!active) return;
      const data = emptyFinancialData();
      normalizedStoreIds.forEach((storeId) => {
        COLLECTION_KEYS.forEach((collectionName) => {
          data[collectionName].push(...(storeResults[storeId]?.[collectionName] || []));
        });
      });
      setState((previous) => ({ data, loading: remaining > 0, error: previous.error }));
    };

    normalizedStoreIds.forEach((storeId) => {
      storeResults[storeId] = {};
      COLLECTION_KEYS.forEach((collectionName) => {
        let receivedFirstSnapshot = false;
        const collectionQuery = query(collection(db, 'lojas', storeId, collectionName));
        const unsubscribe = onSnapshot(
          collectionQuery,
          (snapshot) => {
            storeResults[storeId][collectionName] = withStoreId(snapshot, storeId);
            if (!receivedFirstSnapshot) {
              remaining -= 1;
              receivedFirstSnapshot = true;
            }
            emit();
          },
          (error) => {
            if (!receivedFirstSnapshot) {
              remaining -= 1;
              receivedFirstSnapshot = true;
            }
            if (active) {
              setState((previous) => ({ ...previous, loading: remaining > 0, error }));
            }
            emit();
          },
          {
            __listenerOptions: true,
            operation: `financial-${collectionName}`,
            route: 'financeiro'
          }
        );
        subscriptions.push(unsubscribe);
      });
    });

    return () => {
      active = false;
      subscriptions.forEach((unsubscribe) => unsubscribe());
    };
  }, [normalizedStoreIds]);

  return state;
};
