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
                test: /.*\.css$/,
                type: 'asset/source',
            }
        ],
    },
    resolve: {
        extensions: [
            '.ts', '.js', '.tsx'
        ],
        fallback: {
            fs: false,
            path: false,
            url: false,
            vm: false,
            process: require.resolve('process/browser'),
            Buffer: require.resolve('buffer'),
            stream: require.resolve('stream-browserify'),
            zlib: require.resolve('browserify-zlib'),
            assert: require.resolve('assert'),
            util: require.resolve('util'),
        },
    },
    devtool: 'source-map',
    // babelのため
    plugins: [
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer'],
        }),
        new webpack.ProvidePlugin({
            acorn: path.resolve(__dirname, 'JS-Interpreter', 'acorn.js')
        }),
    ],
};

if (process.env.NODE_ENV == null) {
    module.exports.mode = "development";
}
