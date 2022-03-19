const path = require('path');
const webpack = require('webpack')

module.exports = {
    entry: {
        arib: './client/index.ts',
        video_list: './client/video_list.tsx',
        remote_controller: './client/remote_controller_ui.ts',
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
        fallback: {
            fs: false,
            path: false,
            url: false,
            vm: false,
            process: require.resolve('process/browser'),
            Buffer: require.resolve('buffer'),
        },
    },
    devtool: 'source-map',
    // babelのため
    plugins: [
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: 'buffer',
        }),
        new webpack.ProvidePlugin({
            acorn: path.resolve(__dirname, 'JS-Interpreter', 'acorn.js')
        }),
    ],
};

if (process.env.NODE_ENV == null) {
    module.exports.mode = "development";
}
