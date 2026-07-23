# MiDex

Pokédex en español con herramientas competitivas para Android, hecha con Expo / React Native.

## Funcionalidades

- **Pokédex** completa (incluye megas, formas regionales, primales y Gigamax): stats, habilidades con su condición exacta, movimientos, línea evolutiva con métodos, grupo huevo, EVs que otorga, y galería normal/shiny.
- **Competitivo**: ranking de uso por tier y generación (1-9 + VGC más reciente), sets, spreads, counters y compañeros; referencias de Teratipos, Objetos (con iconos) y Gigamax.
- **Calculadora de daño** (motor oficial `@smogon/calc`): varios movimientos con ranking por KO, golpes múltiples, Poder Oculto, clima/campo, peligros, pantallas, estados, niveles de característica (±6) y curación del defensor.
- **Speed tiers** con buscador y nivel 50/100.
- **Team builder**: equipos guardados, armado automático por coberturas/counters, sets recomendados con control de campo, y análisis de debilidades.
- **Offline con actualización diaria**: todo el contenido se cachea y se refresca automáticamente cada día.

## Datos

- Pokémon Showdown (pokedex/moves/learnsets, items, sprites).
- data.pkmn.cc / Smogon (análisis, sets y estadísticas de uso).
- PokéAPI (traducciones al español, EVs, grupos huevo).

Los datos no competitivos vienen empaquetados en `assets/data/` (generados con `npm run build-data`).

## Desarrollo

```bash
npm install
npm start          # servidor de desarrollo (Expo)
npm run build-data # regenera los JSON offline de assets/data/
```

## Compilar el APK (EAS Build)

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview   # genera un .apk instalable
```

El perfil `production` genera un `.aab` para Google Play. Recuerda subir `versionCode` en `app.json` en cada versión.

## Stack

Expo SDK 57 · React Native 0.86 · React 19 · TypeScript · React Navigation · @smogon/calc
