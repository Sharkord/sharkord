import { configureStore } from '@reduxjs/toolkit';
import { appSliceReducer } from './app/slice';
import { dialogSliceReducer } from './dialogs/slice';
import { serverScreenSliceReducer } from './server-screens/slice';
import { serverSliceReducer } from './server/slice';

export const store = configureStore({
  reducer: {
    app: appSliceReducer,
    server: serverSliceReducer,
    dialog: dialogSliceReducer,
    serverScreen: serverScreenSliceReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      devChecks: {
        identityFunctionCheck: {
          warnAfter: 0 // warn immediately
        }
      }
    })
});

export type IRootState = ReturnType<typeof store.getState>;
