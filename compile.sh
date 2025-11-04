exec_dir=$(dirname "$(pwd)/$0")

if [ ! -d "$exec_dir/build" ]; then
  mkdir build
fi

cd $exec_dir
cmake "$exec_dir" && make -o "$exec_dir/build/hello_world"

# Run test
./build/hello_world
