import React from 'react';
import { Play } from 'lucide-react';
import useGeologicalStore from '../../stores/geologicalStore';
import useGridGeneration from '../../hooks/useGridGeneration';
import Card from '../ui/Card';
import Button from '../ui/Button';

const GridGenerationActions = () => {
  const { isGenerating, canGenerateGrid } = useGeologicalStore();
  const { generateGeologicalGrid } = useGridGeneration();

  const canGenerate = canGenerateGrid();

  return (
    <Card>
      <Button
        onClick={generateGeologicalGrid}
        disabled={!canGenerate}
        loading={isGenerating}
        variant="success"
        icon={<Play className="w-4 h-4" />}
        className="w-full"
      >
        {isGenerating ? 'Generating Grid...' : 'Generate 3D Grid'}
      </Button>
      
      {!canGenerate && (
        <div className="mt-3 p-3 bg-slate-700 rounded-lg">
          <p className="text-sm text-slate-300">
            <strong>Requirements:</strong>
          </p>
          <ul className="text-xs text-slate-400 mt-1 space-y-1">
            <li>• At least 2 horizon surfaces (top and bottom)</li>
            <li>• Valid coordinate data in uploaded files</li>
            <li>• No grid generation currently in progress</li>
          </ul>
        </div>
      )}
    </Card>
  );
};

export default GridGenerationActions;