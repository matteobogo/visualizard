const constants = {

    IMAGE_EXTENSIONS: {
        IMAGE_PNG_EXT: 'png',
        IMAGE_JPEG_EXT: 'jpeg',
        IMAGE_PDF_EXT: 'pdf',
    },

    PATH_HEATMAPS_IMAGES: 'public/images',
    PATH_HEATMAPS_TILES: 'public/images/TILES',
    FILENAME_FAKE_TILE: 'faketile',

    PALETTES: {
        GRAY: {
            RGB_SCALE: [
                {r:61 , g:61 , b:61},
                {r:71 , g:71 , b:71 },
                {r:81 , g:81 , b:81 },
                {r:91 , g:91 , b:91 },
                {r:102 , g:102 , b:102 },
                {r:117 , g:117 , b:117 },
                {r:132 , g:132 , b:132 },
                {r:147 , g:147 , b:147 },
                {r:163 , g:163 , b:163 },
                {r:178 , g:178 , b:178 }
            ],
            OUTLIER_MAX: {r:0, g:0, b:0},
            OUTLIER_MIN: {r:255, g:255, b:255},
        },
        // RED: {
        //     RGB_SCALE: [
        //         {r:255 , g:102 , b:102 },
        //         {r:255 , g:76 , b:76 },
        //         {r:255 , g:50 , b:50 },
        //         {r:255 , g:25 , b:25 },
        //         {r:255 , g:0 , b:0 },
        //         {r:229 , g:0 , b:0 },
        //         {r:204 , g:0 , b:0 },
        //         {r:178 , g:0 , b:0 },
        //         {r:153 , g:0 , b:0 },
        //         {r:127 , g:0 , b:0 }
        //     ],
        //     OUTLIER_MAX: {r:0, g:0, b:0},
        //     OUTLIER_MIN: {r:255, g:255, b:255},
        // },
        // GREEN: {
        //     RGB_SCALE: [
        //         {r: 232, g: 245, b: 233},
        //         {r: 200, g: 230, b: 201},
        //         {r: 165, g: 214, b: 167},
        //         {r: 129, g: 199, b: 132},
        //         {r: 76, g: 175, b: 80},
        //         {r: 67, g: 160, b: 71},
        //         {r: 56, g: 142, b: 60},
        //         {r: 46, g: 125, b: 50},
        //         {r: 27, g: 94, b: 32},
        //         {r: 10, g: 72, b: 13}
        //     ],
        //     OUTLIER_MAX: {r:255, g:0, b:0},
        //     OUTLIER_MIN: {r:255, g:255, b:255},
        // },
        // BLUE: {
        //     RGB_SCALE:[
        //         // {r: 238, g: 247, b: 250},
        //         // {r: 222, g: 239, b: 245},
        //         {r: 205, g: 231, b: 240},
        //         {r: 189, g: 223, b: 235},
        //         {r: 173, g: 216, b: 230},
        //         {r: 138, g: 172, b: 184},
        //         {r: 103, g: 129, b: 138},
        //         {r: 69, g: 86, b: 92},
        //         {r: 34, g: 43, b: 46},
        //     ],
        //     OUTLIER_MAX: {r:139, g:0, b:0},
        //     OUTLIER_MIN: {r:255, g:255, b:255},
        // }
    },

    HEATMAPS: {
        TYPES: {
            SORT_BY_MACHINE: 'Machine ID',
            SORT_BY_SUM: 'Sum',
            SORT_BY_TS_OF_MAX_VALUE: 'Timestamp of max',
        },
        MODES: {
            SINGLE_IMAGE: 'SINGLE_IMAGE',
            TILES: 'TILES',
        },
    },

    ANALYSIS: {
        TYPES: {
            DATASET: 'Dataset Analysis',
            MEASUREMENTS: 'Measurements Analysis',
            POINTS_PER_TIMESTAMP: 'Points per Timestamp Analysis',
        },
    },

    COMPUTATION_PERCENTAGES_INIT: '0',
    COMPUTATION_PERCENTAGES: ['10','20','30','40','50','60','70','80','90','100']
};

module.exports = Object.freeze(constants);