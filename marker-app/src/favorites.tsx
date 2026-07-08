import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, productKey } from './api';

const STORAGE_KEY = 'marker.favorites.v1';

interface FavoritesValue {
  favorites: Product[];
  isFavorite: (p: Product) => boolean;
  toggleFavorite: (p: Product) => void;
}

const FavoritesContext = createContext<FavoritesValue>({
  favorites: [],
  isFavorite: () => false,
  toggleFavorite: () => {},
});

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Product[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => raw && setFavorites(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  const persist = (items: Product[]) => {
    setFavorites(items);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => {});
  };

  const isFavorite = useCallback(
    (p: Product) => favorites.some((f) => productKey(f) === productKey(p)),
    [favorites],
  );

  const toggleFavorite = useCallback(
    (p: Product) => {
      const key = productKey(p);
      persist(
        favorites.some((f) => productKey(f) === key)
          ? favorites.filter((f) => productKey(f) !== key)
          : [p, ...favorites],
      );
    },
    [favorites],
  );

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
