// Define the tea farm area of interest (AOI) - Kiambethu Tea Farm
var tea_farm = ee.Geometry.Rectangle([36.683, -1.116, 36.684, -1.118]);

// Function to mask clouds & shadows using the SCL band
var maskCloudAndShadows = function(image) {
  var scl = image.select('SCL');  // Scene Classification Layer
  var mask = scl.neq(3)  // Exclude clouds
              .and(scl.neq(8))  // Exclude shadows
              .and(scl.neq(9))  // Exclude cirrus clouds
              .and(scl.neq(10)); // Exclude high clouds

  return image.updateMask(mask); 
};

// Load Sentinel-2 Image Collection with Cloud & Shadow Removal
var dataset = ee.ImageCollection('COPERNICUS/S2_SR') 
    .filterBounds(tea_farm)  
    .filterDate('2023-01-01', '2024-07-01')  
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))  
    .map(maskCloudAndShadows)  // cloud & shadow removal
    .select(['B4', 'B8'])  // Red & NIR bands
    .limit(20); 

// Apply reflectance scaling
var scaleReflectance = function(image) {
  return image.multiply(0.0001).copyProperties(image, image.propertyNames()); // Scale by 10,000
};

var dataset_scaled = dataset.map(scaleReflectance);

// EXPORT TO GOOGLE DRIVE //

// Convert ImageCollection to List and Export Each Image
var imagesList = dataset_scaled.toList(dataset_scaled.size());
var numImages = dataset_scaled.size().getInfo();

for (var i = 0; i < numImages; i++) {
  var image = ee.Image(imagesList.get(i));
  var date = ee.Date(image.get('system:time_start')).format('YYYY-MM-dd').getInfo();
  var filename = 'Sentinel2_Scaled_' + date;

  Export.image.toDrive({
    image: image.select(['B4', 'B8']),  // Only Red & NIR bands
    description: filename,
    scale: 10,
    region: tea_farm,
    maxPixels: 1e13,  
    fileFormat: 'GeoTIFF'
  });
}

// Median composite for visualization
var medianImage = dataset_scaled.median();

// Scaled visualization parameters
var visParams = {min: 0, max: 1, bands: ['B4', 'B8'], gamma: 1.4};

// Add processed images to the GEE map
Map.centerObject(tea_farm, 12);
Map.addLayer(medianImage, visParams, 'Cloud-Free, Scaled Red & NIR');
