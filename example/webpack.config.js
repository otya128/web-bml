const path = require('path');
const webpack = require('webpack')

module.exports = {
    entry: {
        arib: './client/index.ts',
        play_local: './client/play_local.ts',
        video_list: './client/video_list.tsx',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
            },
            {
                test: /\.js?$/,
                extractSourceMap: true,
            },
        ],
    },
    resolve: {
        extensions: [
            '.ts', '.js', '.tsx'
        ],
    },
    devtool: 'source-map',
    ignoreWarnings: [/Failed to parse source map/],
};

if (process.env.NODE_ENV == null) {
    module.exports.mode = "development";
}
