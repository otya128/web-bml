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
                test: /default\.css$/,
                type: 'asset/source',
            }
        ],
    },
    resolve: {
        extensions: [
            '.ts', '.js', '.tsx'
        ],
        alias: {
            // 同じリポジトリ内で二重webpackしたくないのでそのままimportさせる
            "web-bml": path.resolve(__dirname, './web-bml/src/index.ts'),
            "web-bml-ts": path.resolve(__dirname, './web-bml-ts/src/decode_ts.ts'),
        },
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
    ],
};

if (process.env.NODE_ENV == null) {
    module.exports.mode = "development";
}
