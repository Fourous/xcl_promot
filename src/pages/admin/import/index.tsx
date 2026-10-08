import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { Network } from '@/network';
import { adminParseImport, adminCommitImport, adminImportBatches } from '@/services/admin';
import { getToken } from '@/utils/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/** Excel 批量导入 */
export default function ImportPage() {
  const [preview, setPreview] = useState<any>(null);
  const [fileName, setFileName] = useState('');
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const isWeapp = Taro.getEnv() === Taro.ENV_TYPE.WEAPP;

  const loadBatches = async () => {
    try {
      const res = await adminImportBatches(getToken());
      setBatches(res.data || []);
    } catch (e) {
      console.error('加载批次失败', e);
    }
  };

  useLoad(() => {
    loadBatches();
  });

  const downloadTemplate = async () => {
    try {
      await Network.downloadFile({
        url: '/api/import/template',
        header: { Authorization: `Bearer ${getToken()}` },
      });
      Taro.showToast({ title: '模板已下载', icon: 'success' });
    } catch (e) {
      Taro.showToast({ title: '下载失败', icon: 'none' });
    }
  };

  const chooseFile = async () => {
    if (!isWeapp) {
      Taro.showToast({ title: '请在微信小程序中使用导入', icon: 'none' });
      return;
    }
    try {
      const res = await Taro.chooseMessageFile({ count: 1, type: 'file' });
      const file = res.tempFiles[0];
      setFileName(file.name);
      setLoading(true);
      const parseRes = await adminParseImport(getToken(), file.path);
      setPreview(parseRes.data);
    } catch (e) {
      console.error('解析失败', e);
      Taro.showToast({ title: '解析失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const commit = async (mode: string) => {
    if (!preview) return;
    if (mode === 'overwrite') {
      const confirm = await Taro.showModal({
        title: '覆盖导入',
        content: '将清空现有候选人后重新导入，是否继续？',
      });
      if (!confirm.confirm) return;
    }
    try {
      await adminCommitImport(getToken(), {
        mode,
        rows: preview.results,
        errors: preview.errors,
        fileName,
      });
      Taro.showToast({ title: '导入成功', icon: 'success' });
      setPreview(null);
      loadBatches();
    } catch (e) {
      Taro.showToast({ title: '导入失败', icon: 'none' });
    }
  };

  const exportErrors = async (id: string) => {
    await Network.downloadFile({
      url: `/api/import/errors/${id}`,
      header: { Authorization: `Bearer ${getToken()}` },
    });
  };

  return (
    <View className="min-h-screen bg-gray-50 pb-8">
      {/* 操作区 */}
      <View className="bg-white px-4 py-5">
        <Text className="block text-base font-bold text-gray-900 mb-3">批量导入候选人</Text>
        <View className="flex flex-row gap-3 mb-3">
          <Button variant="outline" onClick={downloadTemplate}>下载模板</Button>
          <Button onClick={chooseFile} disabled={loading}>
            {loading ? '解析中…' : '选择文件导入'}
          </Button>
        </View>
        <Text className="block text-xs text-gray-500">
          支持 .xlsx / .xls / .csv，标准列：编号 | 姓名 | 部门 | 岗位 | 简介 | 头像文件名
        </Text>
      </View>

      {/* 校验结果预览 */}
      {preview ? (
        <View className="px-4 mt-4">
          <View className="bg-white rounded-lg p-4 mb-3">
            <View className="flex flex-row gap-3 mb-2">
              <Badge variant="default">成功 {preview.success} 行</Badge>
              <Badge variant="destructive">失败 {preview.fail} 行</Badge>
              <Badge variant="secondary">警告 {preview.warnings?.length || 0} 条</Badge>
            </View>
            <Text className="block text-xs text-gray-500">文件名：{fileName}</Text>
          </View>

          {preview.errors?.length ? (
            <View className="bg-white rounded-lg p-4 mb-3">
              <Text className="block text-sm font-bold text-gray-900 mb-2">错误明细</Text>
              {preview.errors.map((e: any, i: number) => (
                <View key={i} className="py-2 border-b border-gray-100 last:border-none">
                  <Text className="block text-sm text-red-600">
                    第 {e.line} 行：{e.name || e.code || '-'}
                  </Text>
                  <Text className="block text-xs text-gray-500 mt-1">
                    {(e.errors || []).join('；')}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View className="flex flex-row gap-3">
            <Button className="flex-1" onClick={() => commit('append')}>追加导入</Button>
            <Button className="flex-1" variant="outline" onClick={() => commit('overwrite')}>
              覆盖导入
            </Button>
          </View>
        </View>
      ) : (
        <View className="px-4 mt-4">
          <View className="bg-white rounded-lg p-8">
            <Text className="block text-sm text-gray-500 text-center">
              请先下载模板，按格式填写后上传导入
            </Text>
          </View>
        </View>
      )}

      {/* 历史批次 */}
      <View className="px-4 mt-6">
        <Text className="block text-base font-bold text-gray-900 mb-3">历史导入记录</Text>
        {batches.length === 0 ? (
          <View className="bg-white rounded-lg p-6">
            <Text className="block text-sm text-gray-500 text-center">暂无导入记录</Text>
          </View>
        ) : (
          batches.map((b: any) => (
            <View key={b.id} className="bg-white rounded-lg p-4 mb-2">
              <View className="flex flex-row items-center justify-between">
                <Text className="block text-sm font-bold text-gray-900">{b.file_name}</Text>
                <Badge variant={b.fail_rows > 0 ? 'destructive' : 'default'}>
                  成功 {b.success_rows} / 失败 {b.fail_rows}
                </Badge>
              </View>
              <View className="flex flex-row items-center justify-between mt-2">
                <Text className="block text-xs text-gray-500">
                  {new Date(b.created_at).toLocaleString()}
                </Text>
                {b.fail_rows > 0 ? (
                  <Button size="sm" variant="outline" onClick={() => exportErrors(b.id)}>
                    导出错误明细
                  </Button>
                ) : null}
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}
