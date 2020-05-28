/* eslint-disable new-cap */

import { DEVICE_PIXEL_RATIO } from 'ol/has';
import { toContext } from 'ol/render';
import olFeature from 'ol/Feature';
import olGeomPoint from 'ol/geom/Point';
import olGeomLineString from 'ol/geom/LineString';
import olGeomPolygon from 'ol/geom/Polygon';
import olLayerImage from 'ol/layer/Image.js';
import olLayerVector from 'ol/layer/Vector.js';
import olLayerLayer from 'ol/layer/Layer.js';
import { Group as LayerGroup } from 'ol/layer.js';
import { extend as olExtend } from 'ol/extent';
import { WFS } from 'ol/format';

/**
 * Util for OL layers
 */

/**
 * Returns a set of map layers which matches the given key value pair.
 *
 * @param {String} key - Key to filter layers
 * @param {Object} value - Value to filter layers
 * @param  {ol.Map} olMap  The OL map to search in
 * @return {ol.layer.Base[]} Array of matching layers
 */
export function getLayersBy(key, value, olMap) {
  if (!olMap) {
    return [];
  }

  let layerMatches = [];
  olMap.getLayers().forEach(function(layer) {
    if (layer.get(key) === value) {
      layerMatches.push(layer);
    }
  });

  return layerMatches;
}

/**
 * Returns OL Layer type.
 *
 * @param  {ol.layer.Base} Object OL layer
 */
export function getLayerType(layer) {
  let layerType;
  if (layer instanceof olLayerImage) {
    layerType = 'WMS';
  } else if (layer instanceof olLayerVector) {
    layerType = 'WFS';
  }
  return layerType;
}

/**
 * Returns a map layer with the given LID (Layer ID)
 *
 * @param  {String} lid    The LID of the layer to query
 * @param  {ol.Map} olMap  The OL map to search in
 * @return {ol.layer.Base} The OL layer instance or undefined
 */
export function getLayerByLid(lid, olMap) {
  return getLayersBy('lid', lid, olMap)[0];
}

/**
 * Returns all map layers excluding from group layer
 *
 * @param  {ol.Map} olMap  The OL map to search in
 * @return {ol.layer.Base[]} Array of all map layers
 */
export function getAllChildLayers(olMap) {
  const allLayers = [];
  olMap
    .getLayers()
    .getArray()
    .forEach(layer => {
      if (layer instanceof LayerGroup) {
        const layers = layer.getLayers().getArray();
        allLayers.push(...layers);
      } else {
        allLayers.push(layer);
      }
    });
  return allLayers;
}

/**
 * Zooms to the given layer's extent.
 * Will only work if the layer has kind of vector source.
 *
 * @param  {ol.layer.Base} vecLayer OL vector layer
 * @param  {ol.Map} olMap           The map to perform the zoom on
 */
export function zoomToLayerExtent(vecLayer, olMap) {
  if (!vecLayer || !vecLayer.getSource().getExtent || !olMap) {
    return;
  }
  const extent = vecLayer.getSource().getExtent();
  olMap.getView().fit(extent);
}

/**
 * Creates the WFS serialized string
 *
 * @param  {string} srsName The source coordinate reference system
 * @param  {string} namespace The Geoserver namespace
 * @param  {string} workspace The Geoserver workspace
 * @param  {string} layerName The Layer name
 * @param  {ol.format.filter} filter The Openlayers filter
 *
 */
export function wfsRequestParser(
  srsName,
  workspace,
  layerNames,
  filter,
  viewparams = undefined
) {
  const xs = new XMLSerializer();
  const opt = {
    srsName: srsName,
    featurePrefix: workspace,
    featureTypes: layerNames,
    outputFormat: 'application/json',
    filter: filter
  };
  if (viewparams) {
    opt.viewParams = viewparams.toString();
  }

  const wfs = new WFS().writeGetFeature(opt);
  const xmlparser = xs.serializeToString(wfs);
  return xmlparser;
}

export function wfsTransactionParser(
  featuresToAdd,
  featuresToUpdate,
  featuresToDelete,
  formatGML
) {
  const wfs = new WFS();
  const xml = wfs.writeTransaction(
    featuresToAdd,
    featuresToUpdate,
    featuresToDelete,
    formatGML
  );
  return xml;
}

export function readTransactionResponse(data) {
  const wfs = new WFS();
  return wfs.readTransactionResponse(data);
}

/**
 * Get an array of all layers in a group. The group can contain multiple levels
 * of others groups.
 * @param {import("ol/layer/Base.js").default} layer The base layer, mostly a group of layers.
 * @return {Array<import("ol/layer/Layer.js").default<import('ol/source/Source.js').default>>} Layers.
 */
export function getFlatLayers(layer) {
  if (layer instanceof LayerGroup) {
    const sublayers = /** @type {import("ol/layer/Layer.js").default<import('ol/source/Source.js').default>[]} */ (layer
      .getLayers()
      .getArray());
    const hasGroupLayer = sublayers.some(
      sublayer => sublayer instanceof LayerGroup
    );
    if (!hasGroupLayer) {
      return sublayers.slice();
    }
  }

  return getFlatLayers_(layer, [], undefined);
}

/**
 * Get an array of all layers in a group. The group can contain multiple levels
 * of others groups. When we flatten a group, we get the child layers.
 * If opacity is defined on the group, this value is lost.
 * Computed opacity is a custom 'back-up' value that contains
 * the calculated value of all ancestors and the given layer.
 * @param {import("ol/layer/Base.js").default} layer The base layer, mostly a group of layers.
 * @param {olLayerLayer<import('ol/source/Source.js').default>[]} array An array to add layers.
 * @param {number|undefined} computedOpacity Opacity inherited from ancestor layer groups.
 * @return {olLayerLayer<import('ol/source/Source.js').default>[]} Layers.
 * @private
 */
export function getFlatLayers_(layer, array, computedOpacity) {
  const opacity = layer.getOpacity();
  if (computedOpacity !== undefined) {
    computedOpacity *= opacity;
  } else {
    computedOpacity = opacity;
  }
  if (layer instanceof LayerGroup) {
    const sublayers = layer.getLayers();
    sublayers.forEach(l => {
      getFlatLayers_(l, array, computedOpacity);
    });
  } else if (layer instanceof olLayerLayer) {
    if (!array.includes(layer)) {
      layer.set('inheritedOpacity', computedOpacity, true);
      array.push(layer);
    }
  }
  return array;
}

/**
 * Gets teh active baselayer if there
 * is one activated otherwise it will return an empty array.
 * @param  {ol.Map} olMap           The map to perform the search on.
 * @return {Array<import("ol/layer/Layer.js").default<import('ol/source/Source.js').default>>} Layers.
 */

export function getActiveBaseLayer(map) {
  const activeBaselayer = map
    .getLayers()
    .getArray()
    .filter(groupLayer => {
      return groupLayer.get('name') === 'backgroundLayers';
    })[0]
    .getLayers()
    .getArray()
    .filter(layer => {
      return layer.getVisible() === true;
    });
  return activeBaselayer;
}

/**
 * Get the WMTS legend URL for the given layer.
 * @param {import("ol/layer/Tile.js").default} layer Tile layer as returned by the
 * layerHelper service.
 * @return {string|undefined} The legend URL or undefined.
 */
export function getWMTSLegendURL(layer) {
  // FIXME case of multiple styles ?  case of multiple legendUrl ?
  let url;
  const styles = layer.get('capabilitiesStyles');
  if (styles !== undefined) {
    const legendURL = styles[0].legendURL;
    if (legendURL !== undefined) {
      url = legendURL[0].href;
    }
  }
  return url;
}

/** Get the image for a style
 * You can provide in options:
 * - a feature width a style
 * - or a feature that will use the legend style function
 * - or properties and a geometry type that will use the legend style function
 * - or a style and a geometry type
 * @param {*} options
 *  @param {ol.Feature} options.feature a feature to draw
 *  @param {ol.style.Style} options.style the style to use if no feature is provided
 *  @param {*} options.properties properties to use with a style function
 *  @param {string} options.typeGeom type geom to draw with the style or the properties
 * @param {Canvas|undefined} canvas a canvas to draw in
 * @param {int|undefined} row row number to draw in canvas
 * @return {CanvasElement}
 */
export function getStyleImage(options, theCanvas, row) {
  options = options || {};
  var size = [40, 25];
  var margin = 10;
  var width = size[0] + 2 * margin;
  var height = size[1] + 2 * margin;
  var canvas = theCanvas;
  var ratio = DEVICE_PIXEL_RATIO;
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = width * ratio;
    canvas.height = height * ratio;
  }

  var ctx = canvas.getContext('2d');
  ctx.save();
  var vectorContext = toContext(ctx);

  var typeGeom = options.typeGeom;
  var style;
  var feature = options.feature;
  if (!feature && options.properties && typeGeom) {
    if (/Point/.test(typeGeom))
      feature = new olFeature(new olGeomPoint([0, 0]));
    else if (/LineString/.test(typeGeom))
      feature = new olFeature(new olGeomLineString([0, 0]));
    else feature = new olFeature(new olGeomPolygon([[0, 0]]));
    feature.setProperties(options.properties);
  }
  if (feature) {
    style = options.style || feature.getStyle();
    if (typeof style === 'function') style = style(feature);
    if (!style) {
      style = typeof style === 'function' ? style(feature) : style || [];
    }
    typeGeom = feature.getGeometry().getType();
  } else {
    style = options.style;
  }
  if (!(style instanceof Array)) style = [style];

  var cx = width / 2;
  var cy = height / 2;
  var sx = size[0] / 2;
  var sy = size[1] / 2;
  var i, s;
  // Get point offset
  if (typeGeom === 'Point') {
    var extent = null;
    for (i = 0; (s = style[i]); i++) {
      var img = s.getImage();
      if (img && img.getAnchor) {
        var anchor = img.getAnchor();
        var si = img.getSize();
        var dx = anchor[0] - si[0];
        var dy = anchor[1] - si[1];
        if (!extent) {
          extent = [dx, dy, dx + si[0], dy + si[1]];
        } else {
          olExtend(extent, [dx, dy, dx + si[0], dy + si[1]]);
        }
      }
    }
    if (extent) {
      cx = cx + (extent[2] + extent[0]) / 2;
      cy = cy + (extent[3] + extent[1]) / 2;
    }
  }

  // Draw image
  cy += theCanvas ? row * height : 0;
  for (i = 0; (s = style[i]); i++) {
    vectorContext.setStyle(s);
    switch (typeGeom) {
      case olGeomPoint:
      case 'Point':
        vectorContext.drawGeometry(new olGeomPoint([cx, cy]));
        break;
      case olGeomLineString:
      case 'LineString':
        ctx.save();
        ctx.rect(margin * ratio, 0, size[0] * ratio, canvas.height);
        ctx.clip();
        vectorContext.drawGeometry(
          new olGeomLineString([
            [cx - sx, cy],
            [cx + sx, cy]
          ])
        );
        ctx.restore();
        break;
      case olGeomPolygon:
      case 'Polygon':
        vectorContext.drawGeometry(
          new olGeomPolygon([
            [
              [cx - sx, cy - sy],
              [cx + sx, cy - sy],
              [cx + sx, cy + sy],
              [cx - sx, cy + sy],
              [cx - sx, cy - sy]
            ]
          ])
        );
        break;
    }
  }

  ctx.restore();
}

/**
 * The function can extract geoserver layernames grouped by worksapce using url
 */
export function extractGeoserverLayerNames(map) {
  let mapLayers;
  let type = '';
  if (map.getLayers) {
    mapLayers = map.getLayers().getArray();
    type = 'mapLayers';
  } else {
    // Layer config object is passed instead of map
    mapLayers = map;
    type = 'configLayers';
  }

  const geoserverLayerNames = {};
  mapLayers.forEach(layer => {
    let url;
    if (type === 'mapLayers') {
      const source = layer.getSource();
      if (
        source.getUrl &&
        source.getUrl() &&
        typeof source.getUrl() === 'function' &&
        source.getUrl() !== undefined
      ) {
        url = source.getUrl()([0, 0, 0, 0]);
      } else if (source.getUrls) {
        if (
          source.getUrls() &&
          source.getUrls()[0] !== undefined &&
          source.getUrls()[0].includes('geoserver')
        ) {
          url = source.getUrls()[0];
        }
      }
    } else {
      url = layer.url;
    }

    if (url && url.includes('geoserver')) {
      let typeName =
        new URLSearchParams(url).get('typename') ||
        url.match('tms/1.0.0/(.*)@EPSG');
      // Only for vector tiles.
      if (Array.isArray(typeName) && typeName.length > 1) {
        typeName = typeName[1];
      }
      if (typeName) {
        const split = typeName.split(':');
        const workspace = split[0];
        const geoserverLayerName = split[1];
        // Workspace is the same for all the layers (this can change in the future. )
        if (!geoserverLayerNames[workspace]) {
          geoserverLayerNames[workspace] = [];
        }
        // Check if layer exists in array and it has 'entity' field
        if (geoserverLayerNames[workspace].indexOf(geoserverLayerName) === -1) {
          geoserverLayerNames[workspace].push(geoserverLayerName);
        }
      }
    }
  });
  return geoserverLayerNames;
}
